"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClickUpClient, ClickUpTask, ClickUpTeam, ClickUpList, ClickUpField } from "@/lib/clickup/client";
import { revalidatePath } from "next/cache";

export interface ClickUpSettingsState {
  message: string;
  success?: boolean;
  errors?: {
    apiToken?: string;
    workspaceId?: string;
    listId?: string;
    clientFieldId?: string;
  };
}

export interface ClickUpTicket {
  id: string;
  customId: string | null;
  name: string;
  dateCreated: Date;
  dueDate: Date | null;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  assignees: {
    id: number;
    username: string;
    profilePicture: string | null;
    initials: string;
  }[];
  taskType: string | null;
  url: string;
  isSubtask: boolean;
}

// Get current workspace ClickUp config
async function getWorkspaceClickUpConfig() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedWorkspaces: {
        select: {
          id: true,
          clickUpEnabled: true,
          clickUpApiToken: true,
          clickUpWorkspaceId: true,
          clickUpListId: true,
          clickUpClientFieldId: true,
        },
      },
      memberships: {
        include: {
          workspace: {
            select: {
              id: true,
              clickUpEnabled: true,
              clickUpApiToken: true,
              clickUpWorkspaceId: true,
              clickUpListId: true,
              clickUpClientFieldId: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Get workspace from owned or membership
  const workspace = user.ownedWorkspaces[0] || user.memberships[0]?.workspace;
  return workspace || null;
}

// Save ClickUp settings
export async function saveClickUpSettings(
  prevState: ClickUpSettingsState,
  formData: FormData
): Promise<ClickUpSettingsState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { message: "No autenticado", success: false };
    }

    const enabled = formData.get("enabled") === "true";
    const apiToken = formData.get("apiToken") as string;
    const workspaceId = formData.get("workspaceId") as string;
    const listId = formData.get("listId") as string;
    const clientFieldId = formData.get("clientFieldId") as string;

    // Validation
    const errors: ClickUpSettingsState["errors"] = {};
    if (enabled) {
      if (!apiToken?.trim()) errors.apiToken = "El token de API es requerido";
      if (!workspaceId?.trim()) errors.workspaceId = "El ID del workspace es requerido";
      if (!listId?.trim()) errors.listId = "El ID de la lista es requerido";
      if (!clientFieldId?.trim()) errors.clientFieldId = "El ID del campo Cliente es requerido";

      if (Object.keys(errors).length > 0) {
        return { message: "Por favor completa todos los campos", success: false, errors };
      }

      // Test connection
      const client = createClickUpClient(apiToken);
      const testResult = await client.testConnection();
      if (!testResult.success) {
        return { message: `Error de conexión: ${testResult.error}`, success: false };
      }
    }

    // Get user's workspace (owned or as admin member)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        ownedWorkspaces: { select: { id: true } },
        memberships: {
          where: { role: "ADMIN" },
          include: { workspace: { select: { id: true } } },
        },
      },
    });

    const workspaceIdToUpdate = user?.ownedWorkspaces[0]?.id || user?.memberships[0]?.workspace?.id;
    if (!workspaceIdToUpdate) {
      return { message: "No se encontró el workspace", success: false };
    }

    // Update workspace
    await prisma.workspace.update({
      where: { id: workspaceIdToUpdate },
      data: {
        clickUpEnabled: enabled,
        clickUpApiToken: enabled ? apiToken.trim() : null,
        clickUpWorkspaceId: enabled ? workspaceId.trim() : null,
        clickUpListId: enabled ? listId.trim() : null,
        clickUpClientFieldId: enabled ? clientFieldId.trim() : null,
      },
    });

    revalidatePath("/app/settings");

    return {
      message: enabled
        ? "Configuración de ClickUp guardada exitosamente"
        : "Integración con ClickUp deshabilitada",
      success: true,
    };
  } catch (error) {
    console.error("Error saving ClickUp settings:", error);
    return { message: "Error al guardar la configuración", success: false };
  }
}

// Get tickets for a company
export async function getCompanyTickets(companyName: string): Promise<{
  success: boolean;
  tickets?: ClickUpTicket[];
  error?: string;
}> {
  try {
    const workspace = await getWorkspaceClickUpConfig();

    if (!workspace) {
      return { success: false, error: "Workspace no encontrado" };
    }

    if (!workspace.clickUpEnabled) {
      return { success: false, error: "Integración con ClickUp no habilitada" };
    }

    if (!workspace.clickUpApiToken || !workspace.clickUpListId || !workspace.clickUpClientFieldId) {
      return { success: false, error: "Configuración de ClickUp incompleta" };
    }

    const client = createClickUpClient(workspace.clickUpApiToken);
    const result = await client.getTasksByClient(
      workspace.clickUpListId,
      workspace.clickUpClientFieldId,
      companyName
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Transform tasks to tickets
    const tickets: ClickUpTicket[] = (result.data || []).map((task: ClickUpTask) => {
      // Find task type from custom fields
      const taskTypeField = task.custom_fields?.find(
        (f) => f.name.toLowerCase() === "tipo" || f.name.toLowerCase() === "type"
      );

      return {
        id: task.id,
        customId: task.custom_id,
        name: task.name,
        dateCreated: new Date(parseInt(task.date_created)),
        dueDate: task.due_date ? new Date(parseInt(task.due_date)) : null,
        status: task.status.status,
        statusColor: task.status.color,
        priority: task.priority?.priority || null,
        priorityColor: task.priority?.color || null,
        assignees: task.assignees.map((a) => ({
          id: a.id,
          username: a.username,
          profilePicture: a.profilePicture,
          initials: a.initials,
        })),
        taskType: taskTypeField?.value?.toString() || null,
        url: task.url,
        isSubtask: !!task.parent,
      };
    });

    return { success: true, tickets };
  } catch (error) {
    console.error("Error getting company tickets:", error);
    return { success: false, error: "Error al obtener los tickets" };
  }
}

// Get ClickUp teams (for config dropdown)
export async function getClickUpTeams(apiToken: string): Promise<{
  success: boolean;
  teams?: ClickUpTeam[];
  error?: string;
}> {
  try {
    const client = createClickUpClient(apiToken);
    const result = await client.getTeams();
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, teams: result.data };
  } catch (error) {
    console.error("Error getting ClickUp teams:", error);
    return { success: false, error: "Error al obtener los equipos" };
  }
}

// Get lists for a space (simplified - gets all lists from all spaces/folders)
export async function getClickUpLists(apiToken: string, teamId: string): Promise<{
  success: boolean;
  lists?: ClickUpList[];
  error?: string;
}> {
  try {
    const client = createClickUpClient(apiToken);
    const spacesResult = await client.getSpaces(teamId);
    
    if (!spacesResult.success || !spacesResult.data) {
      return { success: false, error: spacesResult.error };
    }

    const allLists: ClickUpList[] = [];

    for (const space of spacesResult.data) {
      // Get folderless lists
      const listsResult = await client.getListsInSpace(space.id);
      if (listsResult.success && listsResult.data) {
        allLists.push(...listsResult.data.map((l) => ({ ...l, space: { id: space.id, name: space.name } })));
      }

      // Get folders and their lists
      const foldersResult = await client.getFolders(space.id);
      if (foldersResult.success && foldersResult.data) {
        for (const folder of foldersResult.data) {
          const folderListsResult = await client.getListsInFolder(folder.id);
          if (folderListsResult.success && folderListsResult.data) {
            allLists.push(
              ...folderListsResult.data.map((l) => ({
                ...l,
                folder: { id: folder.id, name: folder.name },
                space: { id: space.id, name: space.name },
              }))
            );
          }
        }
      }
    }

    return { success: true, lists: allLists };
  } catch (error) {
    console.error("Error getting ClickUp lists:", error);
    return { success: false, error: "Error al obtener las listas" };
  }
}

// Get custom fields for a list
export async function getClickUpFields(apiToken: string, listId: string): Promise<{
  success: boolean;
  fields?: ClickUpField[];
  error?: string;
}> {
  try {
    const client = createClickUpClient(apiToken);
    const result = await client.getListFields(listId);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, fields: result.data };
  } catch (error) {
    console.error("Error getting ClickUp fields:", error);
    return { success: false, error: "Error al obtener los campos" };
  }
}
