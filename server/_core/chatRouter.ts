import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  sendDirectMessage,
  getDirectMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  getUnreadMessagesBySender,
  getUnreadCountBySender,
  getRecentChats,
  deleteMessage,
  searchMessages,
  createConversation,
  addParticipant,
  getConversationMessages,
  getUserConversations,
  getActiveConversationsCount,
  getOnlineDriversCount,
} from "../db-chat";

export const chatRouter = router({
  /**
   * Send a direct message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        message: z.string().min(1).max(5000),
        loadId: z.number().optional(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.enum(["image", "document", "location"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[Chat Router] sendMessage called:', {
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          messageLength: input.message.length,
        });

        // Sanitize input: convert empty strings to undefined
        const sanitizedLoadId = input.loadId && Number.isFinite(input.loadId) ? input.loadId : undefined;
        const sanitizedAttachmentUrl = input.attachmentUrl && input.attachmentUrl.trim().length > 0 ? input.attachmentUrl.trim() : undefined;
        const sanitizedAttachmentType = input.attachmentType && input.attachmentType.trim().length > 0 ? input.attachmentType.trim() : undefined;

        const result = await sendDirectMessage(
          ctx.user.id,
          input.recipientId,
          input.message,
          sanitizedLoadId,
          sanitizedAttachmentUrl,
          sanitizedAttachmentType
        );

        if (!result) {
          console.error('[Chat Router] sendDirectMessage returned null/undefined');
          throw new Error('Failed to send message - no result from database');
        }

        console.log('[Chat Router] Message sent successfully:', { messageId: (result as any).id });
        return result;
      } catch (error) {
        console.error('[Chat Router] sendMessage error:', error);
        throw error;
      }
    }),

  /**
   * Get direct messages with a user
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const messages = await getDirectMessages(ctx.user.id, input.contactId, input.limit, input.offset);
      // Note: Do NOT mark as read here - let frontend handle it explicitly via markAsRead mutation
      // This allows unread badges to appear before user opens the conversation
      return messages;
    }),

  /**
   * Mark messages as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await markMessagesAsRead(ctx.user.id, input.contactId);
    }),

  /**
   * Get unread message count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadMessageCount(ctx.user.id);
  }),

  /**
   * Get unread messages grouped by sender
   */
  getUnreadBySender: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadCountBySender(ctx.user.id);
  }),

  /**
   * Get recent chats
   */
  getRecentChats: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(async ({ input, ctx }) => {
      return await getRecentChats(ctx.user.id, input.limit);
    }),

  /**
   * Delete a message
   */
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await deleteMessage(input.messageId, ctx.user.id);
    }),

  /**
   * Search messages
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      return await searchMessages(ctx.user.id, input.query, input.limit);
    }),

  /**
   * Create a group conversation
   */
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        loadId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createConversation(ctx.user.id, input.title, input.description, input.loadId);
    }),

  /**
   * Add participant to conversation
   */
  addParticipant: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await addParticipant(input.conversationId, input.userId);
    }),

  /**
   * Get conversation messages
   */
  getConversationMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return await getConversationMessages(input.conversationId, input.limit, input.offset);
    }),

  /**
   * Get user's conversations
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserConversations(ctx.user.id);
  }),

  /**
   * Get active conversations count
   */
  getActiveConversationsCount: protectedProcedure.query(async ({ ctx }) => {
    return await getActiveConversationsCount(ctx.user.id);
  }),

  /**
   * Get online drivers count
   */
  getOnlineDriversCount: protectedProcedure.query(async () => {
    return await getOnlineDriversCount();
  }),
});
