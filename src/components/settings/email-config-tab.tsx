"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import {
    updateEmailConfig,
    testEmailConnection,
    EmailConfigState,
} from "@/actions/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
        <div className="space-y-6 max-w-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">Configuración de Email</h2>
                    <p className="text-sm text-[var(--muted-text)] mt-1">
                        Configura tu cuenta de Gmail
                    </p>
                </div>
                {emailConfig?.emailConfigured && (
                    <Badge variant="success" className="w-fit">
                        <CheckCircle size={14} className="mr-1" />
                        Configurado
                    </Badge>
                )}
            </div>

            <form action={formAction} className="space-y-4">
                {state?.message && (
                    <div className={`p-3 rounded-xl text-sm ${
                        state.message.includes("success")
                            ? "bg-success-green/10 text-success-green"
                            : "bg-error-red/10 text-error-red"
                    }`}>
                        {state.message}
                    </div>
                )}

                {testResult && (
                    <div className={`p-3 rounded-xl text-sm ${
                        testResult.success
                            ? "bg-success-green/10 text-success-green"
                            : "bg-error-red/10 text-error-red"
                    }`}>
                        {testResult.message}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="emailFromAddress">Email de Gmail</Label>
                    <Input
                        type="email"
                        name="emailFromAddress"
                        id="emailFromAddress"
                        defaultValue={emailConfig?.emailFromAddress || ""}
                        placeholder="tu-email@gmail.com"
                        required
                        error={!!state?.errors?.emailFromAddress}
                    />
                    {state?.errors?.emailFromAddress && (
                        <p className="text-sm text-error-red">{state.errors.emailFromAddress}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="emailFromName">Nombre para mostrar</Label>
                    <Input
                        type="text"
                        name="emailFromName"
                        id="emailFromName"
                        defaultValue={emailConfig?.emailFromName || ""}
                        placeholder="Mi Empresa"
                        required
                        error={!!state?.errors?.emailFromName}
                    />
                    {state?.errors?.emailFromName && (
                        <p className="text-sm text-error-red">{state.errors.emailFromName}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="emailPassword">Contraseña de aplicación</Label>
                    <Input
                        type="password"
                        name="emailPassword"
                        id="emailPassword"
                        defaultValue={emailConfig?.emailPassword || ""}
                        placeholder="•••• •••• •••• ••••"
                        required
                        className="font-mono"
                        error={!!state?.errors?.emailPassword}
                    />
                    {state?.errors?.emailPassword && (
                        <p className="text-sm text-error-red">{state.errors.emailPassword}</p>
                    )}
                    <p className="text-xs text-[var(--muted-text)]">
                        Genera una en{" "}
                        <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nearby-accent hover:underline"
                        >
                            myaccount.google.com/apppasswords
                        </a>
                    </p>
                </div>

                {/* Buttons - stacked on mobile */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button type="submit" className="w-full sm:w-auto">
                        <Mail size={16} />
                        Guardar
                    </Button>

                    {emailConfig?.emailConfigured && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleTestConnection}
                            disabled={testing}
                            className="w-full sm:w-auto"
                        >
                            {testing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Mail size={16} />
                            )}
                            Probar
                        </Button>
                    )}
                </div>
            </form>

            {/* Instructions - collapsible style */}
            <details className="rounded-xl border border-[var(--card-border)] bg-[var(--hover-bg)] overflow-hidden">
                <summary className="px-4 py-3 text-sm font-medium text-[var(--foreground)] cursor-pointer">
                    📌 Instrucciones
                </summary>
                <ol className="list-decimal list-inside text-sm text-[var(--muted-text)] space-y-1 px-4 pb-4">
                    <li>Accede a tu cuenta de Gmail</li>
                    <li>Ve a Contraseñas de aplicaciones</li>
                    <li>Genera una nueva contraseña</li>
                    <li>Copia y pégala aquí</li>
                    <li>Guarda y envía un email de prueba</li>
                </ol>
            </details>
        </div>
    );
}

