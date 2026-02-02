// ClickUp API Client
// API Documentation: https://clickup.com/api

export interface ClickUpConfig {
  apiToken: string;
  workspaceId: string;
  listId: string;
  clientFieldId: string;
}

export interface ClickUpAssignee {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
}

export interface ClickUpStatus {
  status: string;
  color: string;
  type: string;
  orderindex: number;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  value?: string | number | boolean | null;
  type_config?: Record<string, unknown>;
}

export interface ClickUpTask {
  id: string;
  custom_id: string | null;
  name: string;
  text_content: string | null;
  description: string | null;
  status: ClickUpStatus;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  due_date: string | null;
  start_date: string | null;
  assignees: ClickUpAssignee[];
  creator: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture: string | null;
  };
  custom_fields: ClickUpCustomField[];
  url: string;
  priority: {
    id: string;
    priority: string;
    color: string;
  } | null;
  parent: string | null;
  subtasks?: ClickUpTask[];
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
}

export interface ClickUpTeamsResponse {
  teams: ClickUpTeam[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
}

export interface ClickUpSpacesResponse {
  spaces: ClickUpSpace[];
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  hidden: boolean;
  space: { id: string };
}

export interface ClickUpFoldersResponse {
  folders: ClickUpFolder[];
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  folder?: { id: string; name: string };
  space?: { id: string; name: string };
}

export interface ClickUpListsResponse {
  lists: ClickUpList[];
}

export interface ClickUpField {
  id: string;
  name: string;
  type: string;
  type_config: Record<string, unknown>;
  date_created: string;
  hide_from_guests: boolean;
  required: boolean;
}

export interface ClickUpFieldsResponse {
  fields: ClickUpField[];
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ClickUpClient {
  private apiToken: string;
  private baseUrl = "https://api.clickup.com/api/v2";

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: this.apiToken,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Error ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  // Get all teams/workspaces
  async getTeams(): Promise<ApiResult<ClickUpTeam[]>> {
    const result = await this.request<ClickUpTeamsResponse>("/team");
    if (result.success && result.data) {
      return { success: true, data: result.data.teams };
    }
    return { success: false, error: result.error };
  }

  // Get spaces in a team
  async getSpaces(teamId: string): Promise<ApiResult<ClickUpSpace[]>> {
    const result = await this.request<ClickUpSpacesResponse>(`/team/${teamId}/space`);
    if (result.success && result.data) {
      return { success: true, data: result.data.spaces };
    }
    return { success: false, error: result.error };
  }

  // Get folders in a space
  async getFolders(spaceId: string): Promise<ApiResult<ClickUpFolder[]>> {
    const result = await this.request<ClickUpFoldersResponse>(`/space/${spaceId}/folder`);
    if (result.success && result.data) {
      return { success: true, data: result.data.folders };
    }
    return { success: false, error: result.error };
  }

  // Get lists in a folder
  async getListsInFolder(folderId: string): Promise<ApiResult<ClickUpList[]>> {
    const result = await this.request<ClickUpListsResponse>(`/folder/${folderId}/list`);
    if (result.success && result.data) {
      return { success: true, data: result.data.lists };
    }
    return { success: false, error: result.error };
  }

  // Get folderless lists in a space
  async getListsInSpace(spaceId: string): Promise<ApiResult<ClickUpList[]>> {
    const result = await this.request<ClickUpListsResponse>(`/space/${spaceId}/list`);
    if (result.success && result.data) {
      return { success: true, data: result.data.lists };
    }
    return { success: false, error: result.error };
  }

  // Get custom fields for a list
  async getListFields(listId: string): Promise<ApiResult<ClickUpField[]>> {
    const result = await this.request<ClickUpFieldsResponse>(`/list/${listId}/field`);
    if (result.success && result.data) {
      return { success: true, data: result.data.fields };
    }
    return { success: false, error: result.error };
  }

  // Get tasks from a list
  async getTasks(
    listId: string,
    options?: {
      subtasks?: boolean;
      include_closed?: boolean;
      custom_fields?: { field_id: string; operator: string; value: string }[];
    }
  ): Promise<ApiResult<ClickUpTask[]>> {
    const params = new URLSearchParams();
    
    if (options?.subtasks) {
      params.append("subtasks", "true");
    }
    if (options?.include_closed) {
      params.append("include_closed", "true");
    }
    if (options?.custom_fields && options.custom_fields.length > 0) {
      params.append("custom_fields", JSON.stringify(options.custom_fields));
    }

    const queryString = params.toString();
    const endpoint = `/list/${listId}/task${queryString ? `?${queryString}` : ""}`;
    
    const result = await this.request<ClickUpTasksResponse>(endpoint);
    if (result.success && result.data) {
      return { success: true, data: result.data.tasks };
    }
    return { success: false, error: result.error };
  }

  // Get tasks filtered by client name (custom field)
  // Note: ClickUp API has issues filtering by dropdown custom fields (ITEMV2_003 error)
  // So we fetch all tasks and filter on the server side
  async getTasksByClient(
    listId: string,
    clientFieldId: string,
    clientName: string
  ): Promise<ApiResult<ClickUpTask[]>> {
    // Get all tasks without custom field filter
    const result = await this.getTasks(listId, {
      subtasks: true,
      include_closed: true,
    });

    if (!result.success || !result.data) {
      return result;
    }

    // Filter tasks by client name in custom field
    const filteredTasks = result.data.filter((task) => {
      const clientField = task.custom_fields?.find((f) => f.id === clientFieldId);
      if (!clientField) return false;
      
      // Handle different field types
      // For dropdown fields, value might be the option name or ID
      const fieldValue = clientField.value;
      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase() === clientName.toLowerCase();
      }
      // For dropdown with type_config, check the options
      if (clientField.type_config && typeof fieldValue === "number") {
        const options = (clientField.type_config as { options?: { id: string; name: string; orderindex: number }[] }).options;
        const selectedOption = options?.find((opt) => opt.orderindex === fieldValue);
        return selectedOption?.name?.toLowerCase() === clientName.toLowerCase();
      }
      return false;
    });

    return { success: true, data: filteredTasks };
  }

  // Test connection
  async testConnection(): Promise<ApiResult<{ teamName: string }>> {
    const result = await this.getTeams();
    if (result.success && result.data && result.data.length > 0) {
      return { success: true, data: { teamName: result.data[0].name } };
    }
    return { success: false, error: result.error || "No se encontraron equipos" };
  }
}

export function createClickUpClient(apiToken: string): ClickUpClient {
  return new ClickUpClient(apiToken);
}

export { ClickUpClient };
