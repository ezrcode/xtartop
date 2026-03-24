"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/actions/workspace";

export interface TaxState {
  message: string;
  errors?: {
    name?: string;
    rate?: string;
  };
}

async function ensureAdminAccess() {
  const workspace = await getCurrentWorkspace();
  const role = await getUserWorkspaceRole();

  if (!workspace || !role) return { ok: false as const };
  if (role.role !== "OWNER" && role.role !== "ADMIN") return { ok: false as const };

  return { ok: true as const, workspaceId: workspace.id };
}

function parseRate(raw: string): number | null {
  const value = raw.replace(",", ".").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTaxTableUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("`Tax`") ||
    message.includes("\"Tax\"") ||
    message.includes("The table") ||
    message.includes("does not exist") ||
    message.includes("P2021")
  );
}

export async function getTaxes(options?: { activeOnly?: boolean }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  try {
    return await prisma.tax.findMany({
      where: {
        workspaceId: workspace.id,
        ...(options?.activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  } catch (error) {
    if (isTaxTableUnavailable(error)) {
      console.warn("Tax table is not available yet. Returning empty catalog.");
      return [];
    }

    throw error;
  }
}

export async function createTax(
  _prevState: TaxState,
  formData: FormData
): Promise<TaxState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { message: "No autorizado" };

  const name = String(formData.get("name") || "").trim();
  const rateRaw = String(formData.get("rate") || "");
  const rate = parseRate(rateRaw);

  if (!name) {
    return { message: "Error de validación", errors: { name: "El nombre es requerido" } };
  }

  if (rate === null || rate <= 0) {
    return { message: "Error de validación", errors: { rate: "El porcentaje debe ser mayor a 0" } };
  }

  try {
    await prisma.tax.create({
      data: {
        name,
        rate,
        workspaceId: access.workspaceId,
      },
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/deals");
    return { message: "Impuesto creado exitosamente" };
  } catch (error) {
    console.error("Error creating tax:", error);
    if (isTaxTableUnavailable(error)) {
      return { message: "La configuración de impuestos aún no está disponible en la base de datos. Aplica la migración pendiente e inténtalo de nuevo." };
    }
    return { message: "Error al crear el impuesto" };
  }
}

export async function updateTax(
  id: string,
  _prevState: TaxState,
  formData: FormData
): Promise<TaxState> {
  const access = await ensureAdminAccess();
  if (!access.ok) return { message: "No autorizado" };

  const name = String(formData.get("name") || "").trim();
  const rateRaw = String(formData.get("rate") || "");
  const isActive = formData.get("isActive") === "true";
  const rate = parseRate(rateRaw);

  if (!name) {
    return { message: "Error de validación", errors: { name: "El nombre es requerido" } };
  }

  if (rate === null || rate <= 0) {
    return { message: "Error de validación", errors: { rate: "El porcentaje debe ser mayor a 0" } };
  }

  try {
    await prisma.tax.update({
      where: { id },
      data: {
        name,
        rate,
        isActive,
      },
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/deals");
    return { message: "Impuesto actualizado exitosamente" };
  } catch (error) {
    console.error("Error updating tax:", error);
    if (isTaxTableUnavailable(error)) {
      return { message: "La configuración de impuestos aún no está disponible en la base de datos. Aplica la migración pendiente e inténtalo de nuevo." };
    }
    return { message: "Error al actualizar el impuesto" };
  }
}

export async function deleteTax(id: string) {
  const access = await ensureAdminAccess();
  if (!access.ok) return { success: false, error: "No autorizado" };

  try {
    await prisma.tax.delete({ where: { id } });
    revalidatePath("/app/settings");
    revalidatePath("/app/deals");
    return { success: true };
  } catch (error) {
    console.error("Error deleting tax:", error);
    if (isTaxTableUnavailable(error)) {
      return { success: false, error: "La configuración de impuestos aún no está disponible en la base de datos." };
    }
    return { success: false, error: "Error al eliminar el impuesto" };
  }
}

export async function toggleTaxActive(id: string) {
  const access = await ensureAdminAccess();
  if (!access.ok) return { success: false, error: "No autorizado" };

  try {
    const tax = await prisma.tax.findUnique({ where: { id } });
    if (!tax) return { success: false, error: "Impuesto no encontrado" };

    await prisma.tax.update({
      where: { id },
      data: { isActive: !tax.isActive },
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/deals");
    return { success: true };
  } catch (error) {
    console.error("Error toggling tax:", error);
    if (isTaxTableUnavailable(error)) {
      return { success: false, error: "La configuración de impuestos aún no está disponible en la base de datos." };
    }
    return { success: false, error: "Error al cambiar el estado" };
  }
}
