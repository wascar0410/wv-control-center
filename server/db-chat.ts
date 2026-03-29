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
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(chatMessages).values({
    senderId,
    recipientId,
    loadId,
    message,
    attachmentUrl,
    attachmentType,
  });

  // Create notification for recipient
  if (result && result[0]) {
    const messageId = typeof result[0] === 'object' && 'insertId' in result[0] ? result[0].insertId : result[0];
    await db.insert(chatNotifications).values({
      userId: recipientId,
      senderId,
      messageId: messageId as number,
      notificationType: "direct_message",
    });
  }

  return result;
}

/**
 * Get direct messages between two users
 */
export async function getDirectMessages(userId1: number, userId2: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  const allMessages = await db
    .select()
    .from(chatMessages)
    .where(
      or(
        and(eq(chatMessages.senderId, userId1), eq(chatMessages.recipientId, userId2)),
        and(eq(chatMessages.senderId, userId2), eq(chatMessages.recipientId, userId1))
      )
    )
    .orderBy(desc(chatMessages.createdAt));

  return allMessages.slice(offset, offset + limit);
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(chatMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.senderId, senderId), eq(chatMessages.isRead, false)));

  // Also mark notifications as read
  await db
    .update(chatNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(chatNotifications.userId, userId), eq(chatNotifications.senderId, senderId), eq(chatNotifications.isRead, false)));
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(chatNotifications)
    .where(and(eq(chatNotifications.userId, userId), eq(chatNotifications.isRead, false)));

  return result.length;
}

/**
 * Get unread messages by sender
 */
export async function getUnreadMessagesBySender(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.recipientId, userId), eq(chatMessages.isRead, false)))
    .orderBy(desc(chatMessages.createdAt));

  // Group by sender and get latest message
  const grouped: Record<number, any> = {};
  for (const msg of messages) {
    if (!grouped[msg.senderId]) {
      grouped[msg.senderId] = msg;
    }
  }

  return Object.values(grouped);
}

/**
 * Create a group conversation
 */
export async function createConversation(dispatcherId: number, title: string, description?: string, loadId?: number) {
  const db = await getDb();
  if (!db) return null;

  return db.insert(chatConversations).values({
    dispatcherId,
    title,
    description,
    loadId,
  });
}

/**
 * Add participant to conversation
 */
export async function addParticipant(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  return db.insert(chatParticipants).values({
    conversationId,
    userId,
  });
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(conversationId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  // Get messages for this conversation
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.loadId, conversationId))
    .orderBy(desc(chatMessages.createdAt));

  return messages.slice(offset, offset + limit);
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const conversations = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.updatedAt));

  // Filter to only conversations where user is a participant
  const userConversations = [];
  for (const conv of conversations) {
    const participants = await db
      .select()
      .from(chatParticipants)
      .where(and(eq(chatParticipants.conversationId, conv.id), eq(chatParticipants.userId, userId)));

    if (participants.length > 0) {
      userConversations.push(conv);
    }
  }

  return userConversations;
}

/**
 * Get recent chats for a user (last message with each contact)
 */
export async function getRecentChats(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(or(eq(chatMessages.senderId, userId), eq(chatMessages.recipientId, userId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit * 2); // Get more to account for duplicates

  // Group by contact and get latest message
  const grouped: Record<number, any> = {};
  for (const msg of messages) {
    const contactId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    if (!grouped[contactId]) {
      grouped[contactId] = msg;
    }
  }

  return Object.values(grouped).slice(0, limit);
}

/**
 * Delete a message (soft delete by marking as deleted)
 */
export async function deleteMessage(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Verify user owns this message
  const msg = await db.select().from(chatMessages).where(eq(chatMessages.id, messageId));
  if (!msg || msg[0].senderId !== userId) return null;

  // Soft delete by clearing message content
  return db.update(chatMessages).set({ message: "[Deleted]" }).where(eq(chatMessages.id, messageId));
}

/**
 * Search messages
 */
export async function searchMessages(userId: number, query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(or(eq(chatMessages.senderId, userId), eq(chatMessages.recipientId, userId)))
    .orderBy(desc(chatMessages.createdAt));

  // Filter by query in memory
  const filtered = messages.filter((msg: any) => msg.message.toLowerCase().includes(query.toLowerCase()));

  return filtered.slice(0, limit);
}
