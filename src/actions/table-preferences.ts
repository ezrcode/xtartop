"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface TablePreferences {
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  visibleColumns?: string[];
  filters?: Record<string, string>;
  searchTerm?: string;
}

export type AllTablePreferences = Record<string, TablePreferences>;

export async function saveTablePreferences(
  tableName: string,
  preferences: TablePreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No autenticado" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tablePreferences: true },
    });

    const currentPrefs = (user?.tablePreferences as AllTablePreferences) || {};
    const updatedPrefs: AllTablePreferences = {
      ...currentPrefs,
      [tableName]: preferences,
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { tablePreferences: updatedPrefs as Prisma.InputJsonValue },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving table preferences:", error);
    return { success: false, error: "Error al guardar preferencias" };
  }
}

export async function getTablePreferences(
  tableName: string
): Promise<TablePreferences | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tablePreferences: true },
    });

    const allPrefs = (user?.tablePreferences as AllTablePreferences) || {};
    return allPrefs[tableName] || null;
  } catch (error) {
    console.error("Error getting table preferences:", error);
    return null;
  }
}

export async function getAllTablePreferences(): Promise<AllTablePreferences> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {};
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tablePreferences: true },
    });

    return (user?.tablePreferences as AllTablePreferences) || {};
  } catch (error) {
    console.error("Error getting all table preferences:", error);
    return {};
  }
}
