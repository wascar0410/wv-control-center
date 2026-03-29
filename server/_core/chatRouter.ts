import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  sendDirectMessage,
  getDirectMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  getUnreadMessagesBySender,
  getRecentChats,
  deleteMessage,
  searchMessages,
  createConversation,
  addParticipant,
  getConversationMessages,
  getUserConversations,
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
      return await sendDirectMessage(
        ctx.user.id,
        input.recipientId,
        input.message,
        input.loadId,
        input.attachmentUrl,
        input.attachmentType
      );
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
      // Mark as read
      await markMessagesAsRead(ctx.user.id, input.contactId);
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
    return await getUnreadMessagesBySender(ctx.user.id);
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
});
