"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
    updateEmailConfig,
    testEmailConnection,
    EmailConfigState,
} from "@/actions/email";

interface EmailConfigTabProps {
    emailConfig: {
        emailConfigured: boolean;
        emailFromAddress: string | null;
        emailFromName: string | null;
        emailPassword: string | null;
    } | null;
}

export function EmailConfigTab({ emailConfig }: EmailConfigTabProps) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const initialState: EmailConfigState = { message: "", errors: {} };
    const [state, formAction] = useFormState(updateEmailConfig, initialState);

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testEmailConnection();
        setTestResult(result);
        setTesting(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-xtartop-black">Configuración de Email</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Configura tu cuenta de Gmail para enviar emails desde la plataforma
                        </p>
                    </div>
                    {emailConfig?.emailConfigured && (
                        <div className="flex items-center text-success-green text-sm">
                            <CheckCircle size={16} className="mr-1" />
                            Configurado
                        </div>
                    )}
                </div>

                <form action={formAction} className="space-y-6">
                    {state?.message && (
                        <div
                            className={`p-4 rounded-md ${
                                state.message.includes("success")
                                    ? "bg-green-50 text-green-800"
                                    : "bg-red-50 text-red-800"
                            }`}
                        >
                            {state.message}
                        </div>
                    )}

                    {testResult && (
                        <div
                            className={`p-4 rounded-md ${
                                testResult.success
                                    ? "bg-green-50 text-green-800"
                                    : "bg-red-50 text-red-800"
                            }`}
                        >
                            {testResult.message}
                        </div>
                    )}

                    <div>
                        <label htmlFor="emailFromAddress" className="block text-sm font-medium text-dark-slate mb-2">
                            Email de Gmail
                        </label>
                        <input
                            type="email"
                            name="emailFromAddress"
                            id="emailFromAddress"
                            defaultValue={emailConfig?.emailFromAddress || ""}
                            placeholder="tu-email@gmail.com"
                            required
                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                        />
                        {state?.errors?.emailFromAddress && (
                            <p className="mt-1 text-sm text-error-red">{state.errors.emailFromAddress}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emailFromName" className="block text-sm font-medium text-dark-slate mb-2">
                            Nombre para mostrar
                        </label>
                        <input
                            type="text"
                            name="emailFromName"
                            id="emailFromName"
                            defaultValue={emailConfig?.emailFromName || ""}
                            placeholder="Mi Empresa"
                            required
                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                        />
                        {state?.errors?.emailFromName && (
                            <p className="mt-1 text-sm text-error-red">{state.errors.emailFromName}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="emailPassword" className="block text-sm font-medium text-dark-slate mb-2">
                            Contraseña de aplicación de Gmail
                        </label>
                        <input
                            type="password"
                            name="emailPassword"
                            id="emailPassword"
                            defaultValue={emailConfig?.emailPassword || ""}
                            placeholder="•••• •••• •••• ••••"
                            required
                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm font-mono"
                        />
                        {state?.errors?.emailPassword && (
                            <p className="mt-1 text-sm text-error-red">{state.errors.emailPassword}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                            Genera una contraseña de aplicación en:{" "}
                            <a
                                href="https://myaccount.google.com/apppasswords"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-founder-blue hover:underline"
                            >
                                https://myaccount.google.com/apppasswords
                            </a>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900 transition-colors"
                        >
                            <Mail size={16} className="mr-2" />
                            Guardar Configuración
                        </button>

                        {emailConfig?.emailConfigured && (
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testing}
                                className="inline-flex items-center px-4 py-2 border border-graphite-gray rounded-md shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {testing ? (
                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                ) : (
                                    <Mail size={16} className="mr-2" />
                                )}
                                Enviar Email de Prueba
                            </button>
                        )}
                    </div>
                </form>

                {/* Instructions */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📌 Instrucciones</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                        <li>Accede a tu cuenta de Gmail</li>
                        <li>
                            Ve a{" "}
                            <a
                                href="https://myaccount.google.com/apppasswords"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                Contraseñas de aplicaciones
                            </a>
                        </li>
                        <li>Genera una nueva contraseña para &quot;Correo&quot;</li>
                        <li>Copia la contraseña de 16 caracteres y pégala aquí</li>
                        <li>Guarda y envía un email de prueba</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

