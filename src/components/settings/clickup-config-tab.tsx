"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save, Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { saveClickUpSettings, getClickUpTeams, getClickUpLists, getClickUpFields, type ClickUpSettingsState } from "@/actions/clickup";

interface ClickUpConfigTabProps {
    currentConfig: {
        enabled: boolean;
        apiToken: string | null;
        workspaceId: string | null;
        listId: string | null;
        clientFieldId: string | null;
    };
}

function SubmitButton() {
    const { pending } = useFormStatus();
    
    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
            {pending ? (
                <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Guardando...
                </>
            ) : (
                <>
                    <Save size={16} className="mr-2" />
                    Guardar Configuración
                </>
            )}
        </button>
    );
}

export function ClickUpConfigTab({ currentConfig }: ClickUpConfigTabProps) {
    const [enabled, setEnabled] = useState(currentConfig.enabled);
    const [apiToken, setApiToken] = useState(currentConfig.apiToken || "");
    const [workspaceId, setWorkspaceId] = useState(currentConfig.workspaceId || "");
    const [listId, setListId] = useState(currentConfig.listId || "");
    const [clientFieldId, setClientFieldId] = useState(currentConfig.clientFieldId || "");
    
    // Dynamic loading states
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [loadingLists, setLoadingLists] = useState(false);
    const [loadingFields, setLoadingFields] = useState(false);
    
    // Loaded options
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [lists, setLists] = useState<{ id: string; name: string; folder?: { name: string }; space?: { name: string } }[]>([]);
    const [fields, setFields] = useState<{ id: string; name: string; type: string }[]>([]);
    
    const initialState: ClickUpSettingsState = { message: "" };
    const [state, formAction] = useFormState(saveClickUpSettings, initialState);

    const handleLoadTeams = async () => {
        if (!apiToken.trim()) return;
        
        setLoadingTeams(true);
        try {
            const result = await getClickUpTeams(apiToken);
            if (result.success && result.teams) {
                setTeams(result.teams.map(t => ({ id: t.id, name: t.name })));
            }
        } catch (error) {
            console.error("Error loading teams:", error);
        }
        setLoadingTeams(false);
    };

    const handleLoadLists = async () => {
        if (!apiToken.trim() || !workspaceId.trim()) return;
        
        setLoadingLists(true);
        try {
            const result = await getClickUpLists(apiToken, workspaceId);
            if (result.success && result.lists) {
                setLists(result.lists.map(l => ({
                    id: l.id,
                    name: l.name,
                    folder: l.folder,
                    space: l.space,
                })));
            }
        } catch (error) {
            console.error("Error loading lists:", error);
        }
        setLoadingLists(false);
    };

    const handleLoadFields = async () => {
        if (!apiToken.trim() || !listId.trim()) return;
        
        setLoadingFields(true);
        try {
            const result = await getClickUpFields(apiToken, listId);
            if (result.success && result.fields) {
                setFields(result.fields.map(f => ({
                    id: f.id,
                    name: f.name,
                    type: f.type,
                })));
            }
        } catch (error) {
            console.error("Error loading fields:", error);
        }
        setLoadingFields(false);
    };

    return (
        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 mt-6">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <svg 
                            className={enabled ? "text-purple-600" : "text-gray-400"} 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-nearby-dark">
                            Integración con ClickUp
                        </h2>
                        <p className="text-sm text-gray-500">
                            Visualiza tickets y tareas de clientes desde ClickUp
                        </p>
                    </div>
                </div>
                <a 
                    href="https://clickup.com/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-nearby-accent hover:underline flex items-center gap-1"
                >
                    Ver API <ExternalLink size={14} />
                </a>
            </div>

            <form action={formAction} className="space-y-6">
                <input type="hidden" name="enabled" value={enabled.toString()} />
                <input type="hidden" name="apiToken" value={apiToken} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="listId" value={listId} />
                <input type="hidden" name="clientFieldId" value={clientFieldId} />

                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-soft-gray rounded-lg border border-graphite-gray">
                    <div>
                        <p className="font-medium text-dark-slate">Habilitar integración</p>
                        <p className="text-sm text-gray-500">
                            Permite ver tickets de ClickUp en la ficha de cada empresa
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            enabled ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Config fields */}
                {enabled && (
                    <div className="space-y-4 pt-4 border-t border-graphite-gray">
                        <p className="text-sm text-gray-600">
                            Obtén tu API Token en ClickUp → Settings → Apps → API Token
                        </p>

                        {/* API Token */}
                        <div>
                            <label htmlFor="clickUpApiToken" className="block text-sm font-medium text-dark-slate mb-2">
                                API Token <span className="text-error-red">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    id="clickUpApiToken"
                                    value={apiToken}
                                    onChange={(e) => setApiToken(e.target.value)}
                                    placeholder="pk_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="flex-1 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono text-xs"
                                />
                                <button
                                    type="button"
                                    onClick={handleLoadTeams}
                                    disabled={!apiToken.trim() || loadingTeams}
                                    className="px-3 py-2 border border-graphite-gray rounded-md text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {loadingTeams ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                            {state?.errors?.apiToken && (
                                <p className="mt-1 text-sm text-error-red">{state.errors.apiToken}</p>
                            )}
                        </div>

                        {/* Workspace ID */}
                        <div>
                            <label htmlFor="clickUpWorkspaceId" className="block text-sm font-medium text-dark-slate mb-2">
                                Workspace/Team ID <span className="text-error-red">*</span>
                            </label>
                            <div className="flex gap-2">
                                {teams.length > 0 ? (
                                    <select
                                        id="clickUpWorkspaceId"
                                        value={workspaceId}
                                        onChange={(e) => {
                                            setWorkspaceId(e.target.value);
                                            setLists([]);
                                            setFields([]);
                                            setListId("");
                                            setClientFieldId("");
                                        }}
                                        className="flex-1 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    >
                                        <option value="">Selecciona un workspace</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        id="clickUpWorkspaceId"
                                        value={workspaceId}
                                        onChange={(e) => setWorkspaceId(e.target.value)}
                                        placeholder="ej: 12345678"
                                        className="flex-1 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={handleLoadLists}
                                    disabled={!workspaceId.trim() || loadingLists}
                                    className="px-3 py-2 border border-graphite-gray rounded-md text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {loadingLists ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                            {state?.errors?.workspaceId && (
                                <p className="mt-1 text-sm text-error-red">{state.errors.workspaceId}</p>
                            )}
                        </div>

                        {/* List ID */}
                        <div>
                            <label htmlFor="clickUpListId" className="block text-sm font-medium text-dark-slate mb-2">
                                Lista de Tickets <span className="text-error-red">*</span>
                            </label>
                            <div className="flex gap-2">
                                {lists.length > 0 ? (
                                    <select
                                        id="clickUpListId"
                                        value={listId}
                                        onChange={(e) => {
                                            setListId(e.target.value);
                                            setFields([]);
                                            setClientFieldId("");
                                        }}
                                        className="flex-1 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    >
                                        <option value="">Selecciona una lista</option>
                                        {lists.map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l.space?.name} → {l.folder?.name ? `${l.folder.name} → ` : ""}{l.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        id="clickUpListId"
                                        value={listId}
                                        onChange={(e) => setListId(e.target.value)}
                                        placeholder="ej: 901234567"
                                        className="flex-1 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={handleLoadFields}
                                    disabled={!listId.trim() || loadingFields}
                                    className="px-3 py-2 border border-graphite-gray rounded-md text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {loadingFields ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                            {state?.errors?.listId && (
                                <p className="mt-1 text-sm text-error-red">{state.errors.listId}</p>
                            )}
                        </div>

                        {/* Client Field ID */}
                        <div>
                            <label htmlFor="clickUpClientFieldId" className="block text-sm font-medium text-dark-slate mb-2">
                                Campo &quot;Cliente&quot; <span className="text-error-red">*</span>
                            </label>
                            {fields.length > 0 ? (
                                <select
                                    id="clickUpClientFieldId"
                                    value={clientFieldId}
                                    onChange={(e) => setClientFieldId(e.target.value)}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                >
                                    <option value="">Selecciona el campo de cliente</option>
                                    {fields.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.name} ({f.type})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    id="clickUpClientFieldId"
                                    value={clientFieldId}
                                    onChange={(e) => setClientFieldId(e.target.value)}
                                    placeholder="ej: abc123de-f456-7890-abcd-ef1234567890"
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono text-xs"
                                />
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Campo personalizado que contiene el nombre del cliente
                            </p>
                            {state?.errors?.clientFieldId && (
                                <p className="mt-1 text-sm text-error-red">{state.errors.clientFieldId}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Status message */}
                {state?.message && (
                    <div className={`flex items-center gap-2 p-4 rounded-md ${
                        state.success 
                            ? "bg-green-50 text-green-800" 
                            : "bg-red-50 text-red-800"
                    }`}>
                        {state.success ? (
                            <CheckCircle size={18} />
                        ) : (
                            <XCircle size={18} />
                        )}
                        {state.message}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-graphite-gray">
                    <SubmitButton />
                </div>
            </form>

            {/* Info Box */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-800 mb-2">¿Cómo funciona?</h3>
                <ul className="text-sm text-purple-700 space-y-2">
                    <li>• La integración muestra tickets de una lista específica de ClickUp</li>
                    <li>• Los tickets se filtran por un campo personalizado &quot;Cliente&quot; que debe coincidir con el nombre de la empresa</li>
                    <li>• Verás ID, título, fechas, estado, tipo y personas asignadas de cada ticket</li>
                    <li>• La sincronización es de solo lectura (no se modifican datos en ClickUp)</li>
                </ul>
            </div>
        </div>
    );
}
