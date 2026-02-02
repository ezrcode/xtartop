"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Save, Loader2, Cloud, CloudOff, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { saveAdmCloudSettings, type AdmCloudSettingsState } from "@/actions/admcloud";

interface PriceListOption {
    id: string;
    name: string;
}

interface AdmCloudConfigTabProps {
    currentConfig: {
        enabled: boolean;
        appId: string | null;
        username: string | null;
        password: string | null;
        company: string | null;
        role: string | null;
        defaultPriceListId: string | null;
        defaultPriceListName: string | null;
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

export function AdmCloudConfigTab({ currentConfig }: AdmCloudConfigTabProps) {
    const [enabled, setEnabled] = useState(currentConfig.enabled);
    const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);
    const [loadingPriceLists, setLoadingPriceLists] = useState(false);
    const [selectedPriceListId, setSelectedPriceListId] = useState(currentConfig.defaultPriceListId || "");
    const [selectedPriceListName, setSelectedPriceListName] = useState(currentConfig.defaultPriceListName || "");
    
    const initialState: AdmCloudSettingsState = { message: "" };
    const [state, formAction] = useFormState(saveAdmCloudSettings, initialState);

    // Load available price lists when config is enabled and we have credentials
    const loadPriceLists = async () => {
        if (!enabled || !currentConfig.appId || !currentConfig.username) return;
        
        setLoadingPriceLists(true);
        try {
            const response = await fetch("/api/admcloud/price-lists");
            const data = await response.json();
            if (data.priceLists && Array.isArray(data.priceLists)) {
                setPriceLists(data.priceLists);
            }
        } catch (error) {
            console.error("Error loading price lists:", error);
        } finally {
            setLoadingPriceLists(false);
        }
    };

    useEffect(() => {
        if (enabled && currentConfig.appId && currentConfig.username) {
            loadPriceLists();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, currentConfig.appId, currentConfig.username]);

    // Update the selected name when the id changes
    useEffect(() => {
        if (selectedPriceListId && priceLists.length > 0) {
            const found = priceLists.find(p => p.id === selectedPriceListId);
            if (found) {
                setSelectedPriceListName(found.name);
            }
        } else if (!selectedPriceListId) {
            setSelectedPriceListName("");
        }
    }, [selectedPriceListId, priceLists]);

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {enabled ? (
                                <Cloud className="text-green-600" size={24} />
                            ) : (
                                <CloudOff className="text-gray-400" size={24} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-nearby-dark">
                                Integración con AdmCloud
                            </h2>
                            <p className="text-sm text-gray-500">
                                Conecta tu sistema contable para visualizar facturas de clientes
                            </p>
                        </div>
                    </div>
                    <a 
                        href="https://api.admcloud.net/swagger/ui/index" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-nearby-accent hover:underline flex items-center gap-1"
                    >
                        Ver API <ExternalLink size={14} />
                    </a>
                </div>

                <form action={formAction} className="space-y-6">
                    <input type="hidden" name="enabled" value={enabled.toString()} />

                    {/* Toggle de activación */}
                    <div className="flex items-center justify-between p-4 bg-soft-gray rounded-lg border border-graphite-gray">
                        <div>
                            <p className="font-medium text-dark-slate">Habilitar integración</p>
                            <p className="text-sm text-gray-500">
                                Permite consultar facturas de clientes desde AdmCloud
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEnabled(!enabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-nearby-accent focus:ring-offset-2 ${
                                enabled ? 'bg-nearby-accent' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Campos de configuración */}
                    {enabled && (
                        <div className="space-y-4 pt-4 border-t border-graphite-gray">
                            <p className="text-sm text-gray-600">
                                Ingresa las credenciales de tu cuenta de AdmCloud. La API usa autenticación básica (Basic Auth).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="appId" className="block text-sm font-medium text-dark-slate mb-2">
                                        App ID <span className="text-error-red">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="appId"
                                        id="appId"
                                        defaultValue={currentConfig.appId || ""}
                                        placeholder="ej: f9218618-ee43-4ca0-52f9-..."
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm font-mono text-xs"
                                    />
                                    {state?.errors?.appId && (
                                        <p className="mt-1 text-sm text-error-red">{state.errors.appId}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-dark-slate mb-2">
                                        ID de Compañía <span className="text-error-red">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        id="company"
                                        defaultValue={currentConfig.company || ""}
                                        placeholder="ej: 030c4f39-3188-4485-b557-..."
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm font-mono text-xs"
                                    />
                                    {state?.errors?.company && (
                                        <p className="mt-1 text-sm text-error-red">{state.errors.company}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-dark-slate mb-2">
                                        Usuario <span className="text-error-red">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        id="username"
                                        defaultValue={currentConfig.username || ""}
                                        placeholder="Tu usuario de AdmCloud"
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                    />
                                    {state?.errors?.username && (
                                        <p className="mt-1 text-sm text-error-red">{state.errors.username}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-dark-slate mb-2">
                                        Contraseña <span className="text-error-red">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        defaultValue={currentConfig.password || ""}
                                        placeholder="Tu contraseña de AdmCloud"
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                    />
                                    {state?.errors?.password && (
                                        <p className="mt-1 text-sm text-error-red">{state.errors.password}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-dark-slate mb-2">
                                        Rol
                                    </label>
                                    <input
                                        type="text"
                                        name="role"
                                        id="role"
                                        defaultValue={currentConfig.role || "Administradores"}
                                        placeholder="Administradores"
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Normalmente es "Administradores"
                                    </p>
                                </div>
                            </div>

                            {/* Default Price List Selector */}
                            <div className="mt-6 pt-4 border-t border-graphite-gray">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="defaultPriceListId" className="block text-sm font-medium text-dark-slate">
                                        Lista de precios predeterminada
                                    </label>
                                    <button
                                        type="button"
                                        onClick={loadPriceLists}
                                        disabled={loadingPriceLists}
                                        className="text-xs text-nearby-accent hover:text-nearby-accent-600 flex items-center gap-1"
                                    >
                                        <RefreshCw size={12} className={loadingPriceLists ? "animate-spin" : ""} />
                                        Actualizar listas
                                    </button>
                                </div>
                                <input type="hidden" name="defaultPriceListId" value={selectedPriceListId} />
                                <input type="hidden" name="defaultPriceListName" value={selectedPriceListName} />
                                <select
                                    id="defaultPriceListId"
                                    value={selectedPriceListId}
                                    onChange={(e) => setSelectedPriceListId(e.target.value)}
                                    disabled={loadingPriceLists || priceLists.length === 0}
                                    className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:opacity-50"
                                >
                                    <option value="">
                                        {loadingPriceLists 
                                            ? "Cargando listas de precios..." 
                                            : priceLists.length === 0 
                                                ? "Guarda la configuración primero para cargar listas" 
                                                : "Seleccionar lista predeterminada (opcional)"}
                                    </option>
                                    {priceLists.map((priceList) => (
                                        <option key={priceList.id} value={priceList.id}>
                                            {priceList.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Al seleccionar artículos con múltiples precios, esta lista se usará por defecto
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Mensaje de estado */}
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
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">¿Cómo funciona?</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                    <li>• La integración vincula clientes del CRM con clientes de AdmCloud usando el RNC como identificador</li>
                    <li>• Una vez vinculados, podrás ver las facturas de cada cliente directamente en su ficha</li>
                    <li>• La sincronización es de solo lectura (no se modifican datos en AdmCloud)</li>
                    <li>• Los datos de facturas se consultan en tiempo real desde AdmCloud</li>
                </ul>
            </div>
        </div>
    );
}
