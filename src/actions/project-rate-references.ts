"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/actions/workspace";

type ProjectRateUnit = "POR_HORA" | "POR_PROYECTO" | "PAQUETE";

export interface ProjectRateReferenceState {
    message: string;
    errors?: {
        name?: string;
        hourlyRate?: string;
        referenceHours?: string;
        fixedPrice?: string;
    };
}

async function ensureAdminAccess() {
    const workspace = await getCurrentWorkspace();
    const role = await getUserWorkspaceRole();

    if (!workspace || !role) return { ok: false as const };
    if (role.role !== "OWNER" && role.role !== "ADMIN") return { ok: false as const };

    return { ok: true as const, workspaceId: workspace.id };
}

export async function getProjectRateReferences(options?: { activeOnly?: boolean }) {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return prisma.projectRateReference.findMany({
        where: {
            workspaceId: workspace.id,
            ...(options?.activeOnly ? { isActive: true } : {}),
        },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
}

function parseOptionalNumber(raw: string): number | null {
    const value = raw.replace(",", ".").trim();
    if (!value) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeUnit(raw: string): ProjectRateUnit {
    if (raw === "POR_PROYECTO") return "POR_PROYECTO";
    if (raw === "PAQUETE") return "PAQUETE";
    return "POR_HORA";
}

export async function createProjectRateReference(
    _prevState: ProjectRateReferenceState,
    formData: FormData
): Promise<ProjectRateReferenceState> {
    const access = await ensureAdminAccess();
    if (!access.ok) return { message: "No autorizado" };

    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("category") || "").trim() || null;
    const description = String(formData.get("description") || "").trim() || null;
    const unit = normalizeUnit(String(formData.get("unit") || "POR_HORA"));
    const hourlyRateRaw = String(formData.get("hourlyRate") || "");
    const referenceHoursRaw = String(formData.get("referenceHours") || "");
    const fixedPriceRaw = String(formData.get("fixedPrice") || "");
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!name) {
        return { message: "Error de validación", errors: { name: "El nombre es requerido" } };
    }

    const hourlyRate = parseOptionalNumber(hourlyRateRaw);
    const fixedPrice = parseOptionalNumber(fixedPriceRaw);
    const referenceHours = parseOptionalNumber(referenceHoursRaw);

    if (hourlyRateRaw && (hourlyRate === null || hourlyRate <= 0)) {
        return { message: "Error de validación", errors: { hourlyRate: "La tarifa por hora debe ser mayor a 0" } };
    }
    if (fixedPriceRaw && (fixedPrice === null || fixedPrice <= 0)) {
        return { message: "Error de validación", errors: { fixedPrice: "El precio fijo debe ser mayor a 0" } };
    }
    if (referenceHoursRaw && (referenceHours === null || referenceHours <= 0)) {
        return { message: "Error de validación", errors: { referenceHours: "Las horas de referencia deben ser mayores a 0" } };
    }

    try {
        await prisma.projectRateReference.create({
            data: {
                name,
                category,
                description,
                unit,
                hourlyRate,
                referenceHours: referenceHours ? Math.round(referenceHours) : null,
                fixedPrice,
                notes,
                workspaceId: access.workspaceId,
            },
        });

        revalidatePath("/app/settings");
        revalidatePath("/app/deals");
        return { message: "Referencia creada exitosamente" };
    } catch (error) {
        console.error("Error creating project rate reference:", error);
        return { message: "Error al crear la referencia" };
    }
}

export async function updateProjectRateReference(
    id: string,
    _prevState: ProjectRateReferenceState,
    formData: FormData
): Promise<ProjectRateReferenceState> {
    const access = await ensureAdminAccess();
    if (!access.ok) return { message: "No autorizado" };

    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("category") || "").trim() || null;
    const description = String(formData.get("description") || "").trim() || null;
    const unit = normalizeUnit(String(formData.get("unit") || "POR_HORA"));
    const hourlyRateRaw = String(formData.get("hourlyRate") || "");
    const referenceHoursRaw = String(formData.get("referenceHours") || "");
    const fixedPriceRaw = String(formData.get("fixedPrice") || "");
    const notes = String(formData.get("notes") || "").trim() || null;
    const isActive = formData.get("isActive") === "true";

    if (!name) {
        return { message: "Error de validación", errors: { name: "El nombre es requerido" } };
    }

    const hourlyRate = parseOptionalNumber(hourlyRateRaw);
    const fixedPrice = parseOptionalNumber(fixedPriceRaw);
    const referenceHours = parseOptionalNumber(referenceHoursRaw);

    if (hourlyRateRaw && (hourlyRate === null || hourlyRate <= 0)) {
        return { message: "Error de validación", errors: { hourlyRate: "La tarifa por hora debe ser mayor a 0" } };
    }
    if (fixedPriceRaw && (fixedPrice === null || fixedPrice <= 0)) {
        return { message: "Error de validación", errors: { fixedPrice: "El precio fijo debe ser mayor a 0" } };
    }
    if (referenceHoursRaw && (referenceHours === null || referenceHours <= 0)) {
        return { message: "Error de validación", errors: { referenceHours: "Las horas de referencia deben ser mayores a 0" } };
    }

    try {
        await prisma.projectRateReference.update({
            where: { id },
            data: {
                name,
                category,
                description,
                unit,
                hourlyRate,
                referenceHours: referenceHours ? Math.round(referenceHours) : null,
                fixedPrice,
                notes,
                isActive,
            },
        });

        revalidatePath("/app/settings");
        revalidatePath("/app/deals");
        return { message: "Referencia actualizada exitosamente" };
    } catch (error) {
        console.error("Error updating project rate reference:", error);
        return { message: "Error al actualizar la referencia" };
    }
}

export async function deleteProjectRateReference(id: string) {
    const access = await ensureAdminAccess();
    if (!access.ok) return { success: false, error: "No autorizado" };

    try {
        await prisma.projectRateReference.delete({ where: { id } });
        revalidatePath("/app/settings");
        revalidatePath("/app/deals");
        return { success: true };
    } catch (error) {
        console.error("Error deleting project rate reference:", error);
        return { success: false, error: "Error al eliminar la referencia" };
    }
}

export async function toggleProjectRateReferenceActive(id: string) {
    const access = await ensureAdminAccess();
    if (!access.ok) return { success: false, error: "No autorizado" };

    try {
        const record = await prisma.projectRateReference.findUnique({ where: { id } });
        if (!record) return { success: false, error: "Referencia no encontrada" };

        await prisma.projectRateReference.update({
            where: { id },
            data: { isActive: !record.isActive },
        });

        revalidatePath("/app/settings");
        revalidatePath("/app/deals");
        return { success: true };
    } catch (error) {
        console.error("Error toggling project rate reference:", error);
        return { success: false, error: "Error al cambiar el estado" };
    }
}
