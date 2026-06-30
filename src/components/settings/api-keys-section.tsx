"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { createWorkspaceApiKey, revokeWorkspaceApiKey } from "@/actions/workspace";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type ApiKeyRecord = {
    id: string;
    name: string;
    keyPrefix: string;
    scope: "FULL_READ" | "FULL_WRITE" | "FULL_ACCESS";
    isActive: boolean;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    createdBy: {
        name: string | null;
        email: string;
    };
};

interface ApiKeysSectionProps {
    apiKeys: ApiKeyRecord[];
}

function formatDate(value: Date | string | null) {
    if (!value) return "Nunca";
    return new Intl.DateTimeFormat("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function ApiKeysSection({ apiKeys }: ApiKeysSectionProps) {
    const [name, setName] = useState("Agente full access");
    const [scope, setScope] = useState<"FULL_READ" | "FULL_WRITE">("FULL_READ");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [pending, startTransition] = useTransition();

    const activeKeys = apiKeys.filter((key) => key.isActive);

    const handleCreate = () => {
        setMessage(null);
        setCopied(false);
        startTransition(async () => {
            const result = await createWorkspaceApiKey(name, scope);
            if (result.success && result.apiKey) {
                setGeneratedKey(result.apiKey);
                setMessage({ type: "success", text: "API key generada. Guárdala ahora; no volverá a mostrarse completa." });
                return;
            }
            setMessage({ type: "error", text: result.message || "No se pudo generar la API key." });
        });
    };

    const handleRevoke = (apiKeyId: string) => {
        setMessage(null);
        startTransition(async () => {
            const result = await revokeWorkspaceApiKey(apiKeyId);
            setMessage({
                type: result.success ? "success" : "error",
                text: result.message || (result.success ? "API key revocada." : "No se pudo revocar la API key."),
            });
        });
    };

    const handleCopy = async () => {
        if (!generatedKey) return;
        await navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>API Keys para agentes</CardTitle>
                        <p className="text-sm text-[var(--muted-text)] mt-1">
                            Genera claves con acceso completo de lectura a los datos del workspace.
                        </p>
                    </div>
                    <Badge variant="info" className="shrink-0">
                        {activeKeys.length} activas
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {message && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${message.type === "success" ? "border-success-green/25 bg-success-green/10 text-success-green" : "border-error-red/25 bg-error-red/10 text-error-red"}`}>
                        {message.text}
                    </div>
                )}

                {generatedKey && (
                    <div className="rounded-md border border-nearby-dark/20 bg-nearby-dark/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                            <ShieldCheck size={16} />
                            Clave generada
                        </div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <code className="min-w-0 flex-1 rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] break-all">
                                {generatedKey}
                            </code>
                            <Button type="button" variant="secondary" onClick={handleCopy}>
                                {copied ? <Check size={16} /> : <Clipboard size={16} />}
                                {copied ? "Copiada" : "Copiar"}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 rounded-md border border-[var(--card-border)] bg-[var(--hover-bg)] p-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
                    <div className="space-y-2">
                        <Label htmlFor="api-key-name">Nombre de la clave</Label>
                        <Input
                            id="api-key-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Ej. Agente CEO dashboard"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="api-key-scope">Permiso</Label>
                        <select
                            id="api-key-scope"
                            value={scope}
                            onChange={(event) => setScope(event.target.value as "FULL_READ" | "FULL_WRITE")}
                            className="h-10 w-full rounded-md border border-[var(--card-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] shadow-sm focus:border-nearby-dark/50 focus:ring-2 focus:ring-nearby-dark/15"
                        >
                            <option value="FULL_READ">Solo lectura</option>
                            <option value="FULL_WRITE">Lectura y escritura</option>
                        </select>
                    </div>
                    <Button type="button" onClick={handleCreate} disabled={pending}>
                        <Plus size={16} />
                        Generar API key
                    </Button>
                </div>

                <div className="overflow-hidden rounded-md border border-[var(--card-border)]">
                    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-text)]">
                        <span>Claves</span>
                        <span>Estado</span>
                    </div>
                    {apiKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                            <KeyRound className="text-[var(--muted-text)]" size={28} />
                            <p className="text-sm font-medium text-[var(--foreground)]">No hay API keys creadas</p>
                            <p className="text-xs text-[var(--muted-text)]">Genera una clave para conectar agentes externos.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--card-border)]">
                            {apiKeys.map((apiKey) => (
                                <div key={apiKey.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium text-[var(--foreground)]">{apiKey.name}</p>
                                            <Badge variant={apiKey.scope === "FULL_READ" ? "info" : "warning"}>
                                                {apiKey.scope === "FULL_READ" ? "Solo lectura" : "Lectura y escritura"}
                                            </Badge>
                                        </div>
                                        <p className="font-mono text-xs text-[var(--muted-text)]">{apiKey.keyPrefix}</p>
                                        <p className="text-xs text-[var(--muted-text)]">
                                            Creada por {apiKey.createdBy.name || apiKey.createdBy.email} · {formatDate(apiKey.createdAt)}
                                        </p>
                                        <p className="text-xs text-[var(--muted-text)]">Último uso: {formatDate(apiKey.lastUsedAt)}</p>
                                    </div>
                                    <div className="flex items-center gap-3 sm:justify-end">
                                        <Badge variant={apiKey.isActive ? "success" : "secondary"}>
                                            {apiKey.isActive ? "Activa" : "Revocada"}
                                        </Badge>
                                        {apiKey.isActive && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => handleRevoke(apiKey.id)}
                                                disabled={pending}
                                                title="Revocar API key"
                                            >
                                                <Trash2 size={16} className="text-error-red" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted-text)]">
                    Usa la clave con <code className="text-[var(--foreground)]">Authorization: Bearer API_KEY</code> o <code className="text-[var(--foreground)]">X-API-Key: API_KEY</code>. Las claves con escritura registran auditoría automática por recurso y registro afectado.
                </div>
            </CardContent>
        </Card>
    );
}
