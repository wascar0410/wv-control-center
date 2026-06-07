import { getDb } from "./db";
import { chatMessages, chatConversations, chatParticipants, chatNotifications, users } from "../drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";

/**
 * Send a direct message between dispatcher and driver
 */
export async function sendDirectMessage(
  senderId: number,
  recipientId: number,
  message: string,
  loadId?: number,
  attachmentUrl?: string,
  attachmentType?: string
) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Chat] Database connection failed');
      throw new Error('Database connection unavailable');
    }

    console.log('[Chat] Sending message:', { senderId, recipientId, messageLength: message.length });

    // Sanitize optional fields: convert empty strings and invalid types to null
    const normalizedLoadId =
      typeof loadId === 'number' && Number.isFinite(loadId) ? loadId : null;

    const normalizedAttachmentUrl =
      attachmentUrl && typeof attachmentUrl === 'string' && attachmentUrl.trim().length > 0
        ? attachmentUrl.trim()
        : null;

    const normalizedAttachmentType =
      attachmentType && typeof attachmentType === 'string' && attachmentType.trim().length > 0
        ? attachmentType.trim()
        : null;

    console.log('[Chat] Normalized fields:', { normalizedLoadId, normalizedAttachmentUrl, normalizedAttachmentType });

    // Use raw SQL to have full control over which fields are inserted
    // This prevents Drizzle from including all table columns with default/null values
    let messageId: number | null = null;
    
    try {
      // Build SQL based on which optional fields are present
      let sql = 'INSERT INTO chat_messages (senderId, recipientId, message, isRead';
      const params: any[] = [senderId, recipientId, message, false];
      
      if (typeof normalizedLoadId === 'number' && Number.isFinite(normalizedLoadId)) {
        sql += ', loadId';
        params.push(normalizedLoadId);
      }
      
      if (normalizedAttachmentUrl) {
        sql += ', attachmentUrl';
        params.push(normalizedAttachmentUrl);
      }
      
      if (normalizedAttachmentType) {
        sql += ', attachmentType';
        params.push(normalizedAttachmentType);
      }
      
      sql += ') VALUES (' + params.map(() => '?').join(', ') + ')';
      
      console.log('[ChatFix64cb_RAW_SQL] About to execute:', { sql, paramCount: params.length });
      
      // Execute raw SQL using Drizzle's execute method
      const result = await db.execute(sql, params);
      
      console.log('[ChatFix64cb_RAW_SQL] Insert result:', { result });
      
      // Extract insertId from result
      if (result && typeof result === 'object') {
        if ('insertId' in result) {
          messageId = result.insertId as number;
        } else if ('lastID' in result) {
          messageId = result.lastID as number;
        } else if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && 'insertId' in result[0]) {
          messageId = result[0].insertId as number;
        }
      }
      
      if (!messageId) {
        console.error('[ChatFix64cb_RAW_SQL] Failed to extract messageId, trying select:', { result });
        // Fallback: select the latest message from this sender to this recipient
        const selectResult = await db
          .select()
          .from(chatMessages)
          .where(and(eq(chatMessages.senderId, senderId), eq(chatMessages.recipientId, recipientId), eq(chatMessages.message, message)))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);
        
        if (selectResult && selectResult.length > 0) {
          messageId = selectResult[0].id;
          console.log('[ChatFix64cb_RAW_SQL] Got messageId from select:', { messageId });
        }
      }
    } catch (rawSqlError) {
      console.error('[ChatFix64cb_RAW_SQL] Raw SQL insert failed:', rawSqlError);
      throw rawSqlError;
    }

    if (!messageId) {
      console.error('[Chat] Failed to extract messageId after insert');
      throw new Error('Failed to insert message - no ID returned');
    }

    console.log('[Chat] Message inserted:', { messageId, senderId, recipientId });

    // Create notification for recipient
    try {
      await db.insert(chatNotifications).values({
        userId: recipientId,
        senderId,
        messageId: messageId as number,
        notificationType: "direct_message",
      });
      console.log('[Chat] Notification created for user:', recipientId);
    } catch (notifError) {
      console.error('[Chat] Failed to create notification:', notifError);
      // Don't fail the message send if notification fails
    }

    // Return the saved message
    const savedMessage = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId as number))
      .limit(1);

    return savedMessage[0] || { id: messageId };
  } catch (error) {
    console.error('[Chat] sendDirectMessage failed:', error);
    throw error;
  }
}

/**
 * Get direct messages between two users
 */
export async function getDirectMessages(userId1: number, userId2: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatMessages)
    .where(
      or(
        and(eq(chatMessages.senderId, userId1), eq(chatMessages.recipientId, userId2)),
        and(eq(chatMessages.senderId, userId2), eq(chatMessages.recipientId, userId1))
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get recent chats for a user
 */
export async function getRecentChats(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  // Get unique contacts from recent messages
  const recentMessages = await db
    .select()
    .from(chatMessages)
    .where(
      or(
        eq(chatMessages.senderId, userId),
        eq(chatMessages.recipientId, userId)
      )
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(100);

  // Group by contact and get latest message
  const contactMap = new Map();
  for (const msg of recentMessages) {
    const contactId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, msg);
    }
  }

  return Array.from(contactMap.values()).slice(0, limit);
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  const result = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.isRead, false)));

  return result.length;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .update(chatMessages)
    .set({ isRead: true })
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.senderId, senderId)));
}


/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: number) {
  return getUnreadCount(userId);
}

/**
 * Get unread messages from a specific sender
 */
export async function getUnreadMessagesBySender(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.senderId, senderId), eq(chatMessages.isRead, false)));
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  try {
    const result = await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, messageId));

    console.log('[Chat] Message deleted:', { messageId });
    return result;
  } catch (error) {
    console.error('[Chat] Failed to delete message:', error);
    throw error;
  }
}

/**
 * Search messages
 */
export async function searchMessages(userId: number, query: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  // Simple search - in production, use full-text search
  const allMessages = await db
    .select()
    .from(chatMessages)
    .where(
      or(
        eq(chatMessages.senderId, userId),
        eq(chatMessages.recipientId, userId)
      )
    );

  return allMessages.filter(msg => msg.message.toLowerCase().includes(query.toLowerCase()));
}

/**
 * Create a conversation
 */
export async function createConversation(participantIds: number[], name?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  try {
    const result = await db.insert(chatConversations).values({
      name: name || `Conversation ${Date.now()}`,
    });

    console.log('[Chat] Conversation created:', { result });
    return result;
  } catch (error) {
    console.error('[Chat] Failed to create conversation:', error);
    throw error;
  }
}

/**
 * Add participant to a conversation
 */
export async function addParticipant(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  try {
    const result = await db.insert(chatParticipants).values({
      conversationId,
      userId,
    });

    console.log('[Chat] Participant added:', { conversationId, userId });
    return result;
  } catch (error) {
    console.error('[Chat] Failed to add participant:', error);
    throw error;
  }
}

/**
 * Get messages in a conversation
 */
export async function getConversationMessages(conversationId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.loadId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatConversations)
    .where(
      eq(chatConversations.id,
        db.select(chatParticipants.conversationId)
          .from(chatParticipants)
          .where(eq(chatParticipants.userId, userId))
      )
    )
    .limit(limit);
}
