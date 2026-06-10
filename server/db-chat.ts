import { getDb } from "./db";
import { chatMessages, chatConversations, chatParticipants, chatNotifications, users } from "../drizzle/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

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

    // Validate that recipientId is a valid user
    if (!Number.isFinite(recipientId) || recipientId <= 0) {
      throw new Error(`Invalid recipientId: ${recipientId}`);
    }

    // Check if recipient user exists
    const recipientUser = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);
    
    if (!recipientUser || recipientUser.length === 0) {
      console.error('[Chat] Recipient user not found:', { recipientId });
      throw new Error(`Recipient user not found: ${recipientId}`);
    }

    console.log('[CHAT_USER_VALIDATION_1229] Valid users found:', {
      senderId,
      recipientId,
      recipientEmail: recipientUser[0].email
    });

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

    // Use Drizzle sql template for proper parameterized queries
    let messageId: number | null = null;
    
    try {
      console.log('[CHAT_RAW_SQL_TEMPLATE] insert start', { senderId, recipientId, normalizedLoadId, normalizedAttachmentUrl, normalizedAttachmentType });
      
      // Build Drizzle sql template with proper parameter substitution
      const insertSql = sql`
        INSERT INTO chat_messages (senderId, recipientId, message, isRead${normalizedLoadId ? sql`, loadId` : sql``}${normalizedAttachmentUrl ? sql`, attachmentUrl` : sql``}${normalizedAttachmentType ? sql`, attachmentType` : sql``})
        VALUES (${senderId}, ${recipientId}, ${message}, ${false}${normalizedLoadId ? sql`, ${normalizedLoadId}` : sql``}${normalizedAttachmentUrl ? sql`, ${normalizedAttachmentUrl}` : sql``}${normalizedAttachmentType ? sql`, ${normalizedAttachmentType}` : sql``})
      `;
      
      // Execute using Drizzle's execute method with sql template
      const result = await db.execute(insertSql);
      
      console.log('[CHAT_RAW_SQL_TEMPLATE] insert success', { result });
      
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
        console.error('[CHAT_RAW_SQL_TEMPLATE] Failed to extract messageId, trying select:', { result });
        // Fallback: select the latest message from this sender to this recipient
        const selectResult = await db
          .select()
          .from(chatMessages)
          .where(and(eq(chatMessages.senderId, senderId), eq(chatMessages.recipientId, recipientId), eq(chatMessages.message, message)))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);
        
        if (selectResult && selectResult.length > 0) {
          messageId = selectResult[0].id;
          console.log('[CHAT_RAW_SQL_TEMPLATE] selected saved message', { messageId });
        }
      }
    } catch (rawSqlError) {
      console.error('[CHAT_RAW_SQL_TEMPLATE] insert failed:', rawSqlError);
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
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get recent chats for a user with unread count per contact
 */
export async function getRecentChats(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  console.log('[CHAT_RECENT_CHATS_UNREAD_V1] Getting recent chats for user:', userId);

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

  // Group by contact and get latest message + unread count
  const contactMap = new Map();
  const unreadByContact = new Map<number, number>();
  
  for (const msg of recentMessages) {
    const contactId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    
    // Track latest message
    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, msg);
    }
    
    // Count unread from this contact (only if they sent it and it's unread)
    if (msg.senderId === contactId && msg.recipientId === userId && !msg.isRead) {
      const count = unreadByContact.get(contactId) || 0;
      unreadByContact.set(contactId, count + 1);
    }
  }

  // Build result with unread counts
  const result = Array.from(contactMap.entries())
    .map(([contactId, msg]: [number, any]) => ({
      ...msg,
      unreadCount: unreadByContact.get(contactId) || 0,
    }))
    .slice(0, limit);

  console.log('[CHAT_RECENT_CHATS_UNREAD_V1] Result:', result.map(r => ({ contactId: r.senderId === userId ? r.recipientId : r.senderId, unreadCount: r.unreadCount })));
  return result;
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

  console.log('[CHAT_MARK_AS_READ_V1] Marking messages as read:', { userId, senderId });

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
 * Get unread count grouped by sender for a user
 */
export async function getUnreadCountBySender(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  console.log('[CHAT_UNREAD_COUNT_V1] Getting unread count by sender for user:', userId);

  const unreadMessages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.isRead, false)));

  // Group by senderId and count
  const unreadBySender = new Map<number, number>();
  for (const msg of unreadMessages) {
    const count = unreadBySender.get(msg.senderId) || 0;
    unreadBySender.set(msg.senderId, count + 1);
  }

  // Convert to array of { senderId, unreadCount }
  const result = Array.from(unreadBySender.entries()).map(([senderId, unreadCount]) => ({
    senderId,
    unreadCount,
  }));

  console.log('[CHAT_UNREAD_COUNT_V1] Result:', result);
  return result;
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

  return allMessages.filter((msg: any) =>
    msg.message.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Create a group conversation
 */
export async function createConversation(
  userId: number,
  title: string,
  description?: string,
  loadId?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  const conversation = await db.insert(chatConversations).values({
    title,
    description,
    loadId,
  });

  // Add creator as participant
  await db.insert(chatParticipants).values({
    conversationId: (conversation as any)[0],
    userId,
  });

  return conversation;
}

/**
 * Add participant to conversation
 */
export async function addParticipant(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db.insert(chatParticipants).values({
    conversationId,
    userId,
  });
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  conversationId: number,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, conversationId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  return db
    .select()
    .from(chatConversations)
    .innerJoin(chatParticipants, eq(chatConversations.id, chatParticipants.conversationId))
    .where(eq(chatParticipants.userId, userId));
}
