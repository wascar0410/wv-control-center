import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCompany,
  getCompanyById,
  getCompaniesByOwnerId,
  updateCompany,
  deleteCompany,
} from "../db";
import { TRPCError } from "@trpc/server";

export const companyRouter = router({
  /**
   * Create new company
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Company name is required"),
        dotNumber: z.string().optional(),
        mcNumber: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        logoUrl: z.string().optional(),
        description: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insurancePolicyNumber: z.string().optional(),
        insuranceExpiryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await createCompany({
          ...input,
          ownerId: ctx.user.id,
        });
      } catch (error) {
        console.error("[company.create] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo crear la empresa",
        });
      }
    }),

  /**
   * Get company by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getCompanyById(input.id);
      } catch (error) {
        console.error("[company.getById] error:", error);
        return null;
      }
    }),

  /**
   * Get all companies for current user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user.role === "admin") {
        // Admins see all companies
        const db = await (await import("../db")).getDb?.();
        if (!db) return [];
        return db.query.companies.findMany();
      } else {
        // Owners see only their companies
        return await getCompaniesByOwnerId(ctx.user.id);
      }
    } catch (error) {
      console.error("[company.getAll] error:", error);
      return [];
    }
  }),

  /**
   * Update company
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        dotNumber: z.string().optional(),
        mcNumber: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        logoUrl: z.string().optional(),
        description: z.string().optional(),
        insuranceProvider: z.string().optional(),
        insurancePolicyNumber: z.string().optional(),
        insuranceExpiryDate: z.date().optional(),
        complianceStatus: z.enum(["active", "suspended", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const company = await getCompanyById(input.id);
        if (!company) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Empresa no encontrada" });
        }

        if (company.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes editar esta empresa" });
        }

        const { id, ...updateData } = input;
        return await updateCompany(id, updateData);
      } catch (error) {
        console.error("[company.update] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo actualizar la empresa",
        });
      }
    }),

  /**
   * Delete company
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const company = await getCompanyById(input.id);
        if (!company) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Empresa no encontrada" });
        }

        if (company.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar esta empresa" });
        }

        return await deleteCompany(input.id);
      } catch (error) {
        console.error("[company.delete] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo eliminar la empresa",
        });
      }
    }),
});
