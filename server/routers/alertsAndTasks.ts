import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAlert,
  getAlertsForUser,
  markAlertAsRead,
  acknowledgeAlert,
  getUnreadAlertCount,
  createTask,
  getTasksForUser,
  updateTaskStatus,
  updateTaskProgress,
  getTaskWithComments,
  addTaskComment,
  getOverdueTasks,
  getTasksDueToday,
  getTaskStats,
} from "../db";
import { TRPCError } from "@trpc/server";

export const alertsAndTasksRouter = router({
  /**
   * ===== ALERTS =====
   */

  /**
   * Create alert
   */
  createAlert: protectedProcedure
    .input(
      z.object({
        type: z.string(),
        title: z.string(),
        message: z.string(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional(),
        recipientUserId: z.number(),
        recipientRole: z.string().optional(),
        actionUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createAlert(input);
    }),

  /**
   * Get my alerts
   */
  getMyAlerts: protectedProcedure
    .input(
      z.object({
        isRead: z.boolean().optional(),
        severity: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return getAlertsForUser(ctx.user.id, input);
    }),

  /**
   * Mark alert as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return markAlertAsRead(input.id);
    }),

  /**
   * Acknowledge alert
   */
  acknowledge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return acknowledgeAlert(input.id);
    }),

  /**
   * Get unread alert count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadAlertCount(ctx.user.id);
  }),

  /**
   * ===== TASKS =====
   */

  /**
   * Create task
   */
  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedTo: z.number(),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.number().optional(),
        dueDate: z.date().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createTask({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * Get my tasks
   */
  getMyTasks: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return getTasksForUser(ctx.user.id, input);
    }),

  /**
   * Update task status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      return updateTaskStatus(input.id, input.status);
    }),

  /**
   * Update task progress
   */
  updateProgress: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        progress: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ input }) => {
      return updateTaskProgress(input.id, input.progress);
    }),

  /**
   * Get task with comments
   */
  getWithComments: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getTaskWithComments(input.id);
    }),

  /**
   * Add comment to task
   */
  addComment: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        comment: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return addTaskComment(input.taskId, input.comment, ctx.user.id);
    }),

  /**
   * Get overdue tasks
   */
  getOverdue: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getOverdueTasks();
  }),

  /**
   * Get tasks due today
   */
  getDueToday: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getTasksDueToday();
  }),

  /**
   * Get task statistics
   */
  getStats: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.userId && input.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getTaskStats(input.userId);
    }),
});
