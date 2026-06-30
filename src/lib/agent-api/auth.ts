import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type AgentAuthContext = {
    workspaceId: string;
    workspaceName: string;
    apiKeyId: string;
    scope: "FULL_ACCESS";
};

function hashApiKey(apiKey: string) {
    return createHash("sha256").update(apiKey).digest("hex");
}

function extractApiKey(request: NextRequest) {
    const bearer = request.headers.get("authorization");
    if (bearer?.toLowerCase().startsWith("bearer ")) {
        return bearer.slice(7).trim();
    }

    return request.headers.get("x-api-key")?.trim() || "";
}

export async function authenticateAgentRequest(request: NextRequest): Promise<
    | { ok: true; context: AgentAuthContext }
    | { ok: false; response: NextResponse }
> {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
        return {
            ok: false,
            response: NextResponse.json({ error: "API key requerida" }, { status: 401 }),
        };
    }

    const keyHash = hashApiKey(apiKey);
    const record = await prisma.workspaceApiKey.findUnique({
        where: { keyHash },
        include: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!record || !record.isActive || record.revokedAt) {
        return {
            ok: false,
            response: NextResponse.json({ error: "API key inválida o revocada" }, { status: 401 }),
        };
    }

    await prisma.workspaceApiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        ok: true,
        context: {
            workspaceId: record.workspaceId,
            workspaceName: record.workspace.name,
            apiKeyId: record.id,
            scope: record.scope,
        },
    };
}

export function jsonAgentResponse(data: unknown, init?: ResponseInit) {
    return NextResponse.json(normalizeForJson(data), init);
}

function normalizeForJson(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value !== "object") return value;

    if (typeof (value as { toNumber?: unknown }).toNumber === "function") {
        return (value as { toNumber: () => number }).toNumber();
    }

    if (Array.isArray(value)) return value.map(normalizeForJson);

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, normalizeForJson(entry)])
    );
}
