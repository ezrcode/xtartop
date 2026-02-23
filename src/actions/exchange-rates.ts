"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/actions/workspace";

export interface ExchangeRateState {
    message: string;
    errors?: {
        date?: string;
        rate?: string;
    };
}

function parseRate(raw: string): number {
    const normalized = raw.replace(",", ".").trim();
    return Number(normalized);
}

function parseDate(raw: string): Date | null {
    if (!raw) return null;
    // Keep local date semantics by setting midday to avoid TZ edge cases
    const d = new Date(`${raw}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

async function ensureAdminAccess() {
    const workspace = await getCurrentWorkspace();
    const role = await getUserWorkspaceRole();

    if (!workspace || !role) return { ok: false as const };
    if (role.role !== "OWNER" && role.role !== "ADMIN") return { ok: false as const };

    return { ok: true as const, workspaceId: workspace.id };
}

export async function getExchangeRates() {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return prisma.exchangeRate.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
}

export async function getLatestExchangeRate() {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return prisma.exchangeRate.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
}

export async function createExchangeRate(
    _prevState: ExchangeRateState,
    formData: FormData
): Promise<ExchangeRateState> {
    const access = await ensureAdminAccess();
    if (!access.ok) return { message: "No autorizado" };

    const dateRaw = String(formData.get("date") || "");
    const rateRaw = String(formData.get("rate") || "");
    const notes = String(formData.get("notes") || "").trim() || null;

    const date = parseDate(dateRaw);
    if (!date) {
        return { message: "Error de validación", errors: { date: "Fecha inválida" } };
    }

    const rate = parseRate(rateRaw);
    if (!Number.isFinite(rate) || rate <= 0) {
        return { message: "Error de validación", errors: { rate: "La tasa debe ser mayor a 0" } };
    }

    try {
        await prisma.exchangeRate.create({
            data: {
                date,
                rate,
                notes,
                workspaceId: access.workspaceId,
            },
        });

        revalidatePath("/app/settings");
        return { message: "Tasa creada exitosamente" };
    } catch (error) {
        console.error("Error creating exchange rate:", error);
        return { message: "Error al crear la tasa" };
    }
}

export async function updateExchangeRate(
    id: string,
    _prevState: ExchangeRateState,
    formData: FormData
): Promise<ExchangeRateState> {
    const access = await ensureAdminAccess();
    if (!access.ok) return { message: "No autorizado" };

    const dateRaw = String(formData.get("date") || "");
    const rateRaw = String(formData.get("rate") || "");
    const notes = String(formData.get("notes") || "").trim() || null;

    const date = parseDate(dateRaw);
    if (!date) {
        return { message: "Error de validación", errors: { date: "Fecha inválida" } };
    }

    const rate = parseRate(rateRaw);
    if (!Number.isFinite(rate) || rate <= 0) {
        return { message: "Error de validación", errors: { rate: "La tasa debe ser mayor a 0" } };
    }

    try {
        await prisma.exchangeRate.update({
            where: { id },
            data: { date, rate, notes },
        });

        revalidatePath("/app/settings");
        return { message: "Tasa actualizada exitosamente" };
    } catch (error) {
        console.error("Error updating exchange rate:", error);
        return { message: "Error al actualizar la tasa" };
    }
}

export async function deleteExchangeRate(id: string) {
    const access = await ensureAdminAccess();
    if (!access.ok) return { success: false, error: "No autorizado" };

    try {
        await prisma.exchangeRate.delete({ where: { id } });
        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Error deleting exchange rate:", error);
        return { success: false, error: "Error al eliminar la tasa" };
    }
}
