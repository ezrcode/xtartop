"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save, Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { saveDecimaSettings, type DecimaSettingsState } from "@/actions/decima";

interface DecimaConfigTabProps {
    currentConfig: {
        enabled: boolean;
        apiKey: string | null;
    };
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 transition-colors disabled:opacity-50"
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

export function DecimaConfigTab({ currentConfig }: DecimaConfigTabProps) {
    const [enabled, setEnabled] = useState(currentConfig.enabled);
    const [apiKey, setApiKey] = useState(currentConfig.apiKey || "");

    const initialState: DecimaSettingsState = { message: "" };
    const [state, formAction] = useFormState(saveDecimaSettings, initialState);

    return (
        <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-6 mt-6">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enabled ? 'bg-indigo-100' : 'bg-[var(--hover-bg)]'}`}>
                        <svg
                            className={enabled ? "text-indigo-600" : "text-[var(--muted-text)]"}
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">
                            Integración con Décima Portal
                        </h2>
                        <p className="text-sm text-[var(--muted-text)]">
                            Crea y consulta órdenes de compra en el portal de Décima Tech
                        </p>
                    </div>
                </div>
                <a
                    href="https://portal.decima.us"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--foreground)] font-medium hover:underline flex items-center gap-1"
                >
                    Ir al Portal <ExternalLink size={14} />
                </a>
            </div>

            <form action={formAction} className="space-y-6">
                <input type="hidden" name="enabled" value={enabled.toString()} />
                <input type="hidden" name="apiKey" value={apiKey} />

                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-soft-gray rounded-lg border border-[var(--card-border)]">
                    <div>
                        <p className="font-medium text-[var(--foreground)]">Habilitar integración</p>
                        <p className="text-sm text-[var(--muted-text)]">
                            Permite enviar órdenes de compra al portal de Décima
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            enabled ? 'bg-indigo-600' : 'bg-[var(--surface-3)]'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--card-bg)] shadow ring-0 transition duration-200 ease-in-out ${
                                enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Config fields */}
                {enabled && (
                    <div className="space-y-4 pt-4 border-t border-[var(--card-border)]">
                        <p className="text-sm text-[var(--muted-text)]">
                            Ingresa la API Key proporcionada por Décima Tech para conectar con su portal.
                        </p>

                        {/* API Key */}
                        <div>
                            <label htmlFor="decimaApiKey" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                API Key <span className="text-error-red">*</span>
                            </label>
                            <input
                                type="password"
                                id="decimaApiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="decima_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs"
                            />
                            <p className="mt-1 text-xs text-[var(--muted-text)]">
                                La conexión se verificará al guardar
                            </p>
                            {state?.errors?.apiKey && (
                                <p className="mt-1 text-sm text-error-red">{state.errors.apiKey}</p>
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

                <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
                    <SubmitButton />
                </div>
            </form>

            {/* Info Box */}
            <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-medium text-indigo-800 mb-2">¿Cómo funciona?</h3>
                <ul className="text-sm text-indigo-700 space-y-2">
                    <li>• Crea órdenes de compra desde el módulo de Compras y envíalas al portal de Décima</li>
                    <li>• Los productos disponibles se cargan directamente desde la API de Décima</li>
                    <li>• El precio se calcula en el servidor de Décima, solo envías producto y cantidad</li>
                    <li>• Sincroniza el estado de las órdenes para saber cuándo fueron confirmadas</li>
                </ul>
            </div>
        </div>
    );
}
