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
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await createAlert(input);
      } catch (err) {
        console.error("[alerts.createAlert] Error:", err);
        throw err;
      }
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
      try {
        const result = await getAlertsForUser(ctx.user.id, input);
        return result || [];
      } catch (err) {
        console.error("[alerts.getMyAlerts] Error:", err);
        return [];
      }
    }),

  /**
   * Mark alert as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await markAlertAsRead(input.id);
      } catch (err) {
        console.error("[alerts.markAsRead] Error:", err);
        throw err;
      }
    }),

  /**
   * Acknowledge alert
   */
  acknowledge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await acknowledgeAlert(input.id);
      } catch (err) {
        console.error("[alerts.acknowledge] Error:", err);
        throw err;
      }
    }),

  /**
   * Get unread alert count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await getUnreadAlertCount(ctx.user.id);
      return result || 0;
    } catch (err) {
      console.error("[alerts.getUnreadCount] Error:", err);
      return 0;
    }
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
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await createTask({
          ...input,
          createdBy: ctx.user.id,
        });
      } catch (err) {
        console.error("[tasks.createTask] Error:", err);
        throw err;
      }
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
      try {
        const result = await getTasksForUser(ctx.user.id, input);
        return result || [];
      } catch (err) {
        console.error("[tasks.getMyTasks] Error:", err);
        return [];
      }
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
      try {
        return await updateTaskStatus(input.id, input.status);
      } catch (err) {
        console.error("[tasks.updateStatus] Error:", err);
        throw err;
      }
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
      try {
        return await updateTaskProgress(input.id, input.progress);
      } catch (err) {
        console.error("[tasks.updateProgress] Error:", err);
        throw err;
      }
    }),

  /**
   * Get task with comments
   */
  getWithComments: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getTaskWithComments(input.id);
      } catch (err) {
        console.error("[tasks.getWithComments] Error:", err);
        return null;
      }
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
      try {
        return await addTaskComment(input.taskId, input.comment, ctx.user.id);
      } catch (err) {
        console.error("[tasks.addComment] Error:", err);
        throw err;
      }
    }),

  /**
   * Get overdue tasks
   */
  getOverdue: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await getOverdueTasks();
      return result || [];
    } catch (err) {
      console.error("[tasks.getOverdue] Error:", err);
      return [];
    }
  }),

  /**
   * Get tasks due today
   */
  getDueToday: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await getTasksDueToday();
      return result || [];
    } catch (err) {
      console.error("[tasks.getDueToday] Error:", err);
      return [];
    }
  }),

  /**
   * Get task statistics
   */
  getStats: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        if (input.userId && input.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await getTaskStats(input.userId);
        return result || {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        };
      } catch (err) {
        console.error("[tasks.getStats] Error:", err);
        return {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        };
      }
    }),
});
