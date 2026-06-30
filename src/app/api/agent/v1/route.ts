import { NextRequest } from "next/server";
import { authenticateAgentRequest, jsonAgentResponse } from "@/lib/agent-api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const authResult = await authenticateAgentRequest(request);
    if (!authResult.ok) return authResult.response;

    return jsonAgentResponse({
        workspace: {
            id: authResult.context.workspaceId,
            name: authResult.context.workspaceName,
        },
        scope: authResult.context.scope,
        resources: [
            "workspace",
            "companies",
            "contacts",
            "deals",
            "quotes",
            "subscriptions",
            "projects",
            "client-users",
            "activities",
        ],
        usage: {
            auth: "Authorization: Bearer API_KEY o X-API-Key: API_KEY",
            resourceUrl: "/api/agent/v1/{resource}?page=1&limit=100&search=texto",
            maxLimit: 200,
        },
    });
}
