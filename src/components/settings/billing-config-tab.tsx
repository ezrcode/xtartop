"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
    Save,
    Loader2,
    Receipt,
    Mail,
    Info,
    CheckCircle,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Link2,
    ImagePlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
    updateBillingConfig,
    getWorkspaceUserEmailConfig,
    updateWorkspaceUserEmailConfig,
    testWorkspaceUserEmailConfig,
} from "@/actions/billing-config";

interface BillingConfigProps {
    currentConfig: {
        enabled: boolean;
        emailsCC: string | null;
        emailsBCC: string | null;
        emailSubject: string | null;
        emailBody: string | null;
        fromUserId: string | null;
    };
    availableUsers: {
        id: string;
        name: string | null;
        email: string;
        emailConfigured: boolean;
    }[];
    senderEmailConfig?: {
        emailConfigured: boolean;
        emailFromAddress: string | null;
        emailFromName: string | null;
        emailPassword: string | null;
    } | null;
}

const defaultEmailSubject = "Proforma mensual - {{EMPRESA}} - {{MES}} {{AÑO}}";
const defaultEmailBody = `Estimado(a) cliente,

Adjunto encontrará la proforma correspondiente a su suscripción mensual de servicios.

Detalles:
- Empresa: {{EMPRESA}}
- Período: {{MES}} {{AÑO}}
- Número de documento: {{NUMERO_PROFORMA}}

Favor realizar el pago según las instrucciones indicadas en el documento adjunto.

Cualquier consulta, no dude en contactarnos.

Saludos cordiales,
{{PROVEEDOR_NOMBRE}}`;

function normalizeBodyToHtml(template: string): string {
    const trimmed = template.trim();
    if (!trimmed) return "";

    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    if (hasHtmlTags) {
        return template;
    }

    const escaped = trimmed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return escaped
        .split(/\n{2,}/)
        .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
        .join("");
}

export function BillingConfigTab({ currentConfig, availableUsers, senderEmailConfig = null }: BillingConfigProps) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const signatureInputRef = useRef<HTMLInputElement | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [enabled, setEnabled] = useState(currentConfig.enabled);
    const [emailsCC, setEmailsCC] = useState(currentConfig.emailsCC || "");
    const [emailsBCC, setEmailsBCC] = useState(currentConfig.emailsBCC || "");
    const [emailSubject, setEmailSubject] = useState(currentConfig.emailSubject || defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(
        normalizeBodyToHtml(currentConfig.emailBody || defaultEmailBody)
    );
    const [fromUserId, setFromUserId] = useState(currentConfig.fromUserId || "");

    const [senderAddress, setSenderAddress] = useState(senderEmailConfig?.emailFromAddress || "");
    const [senderName, setSenderName] = useState(senderEmailConfig?.emailFromName || "");
    const [senderPassword, setSenderPassword] = useState(senderEmailConfig?.emailPassword || "");
    const [senderConfigured, setSenderConfigured] = useState(senderEmailConfig?.emailConfigured || false);
    const [senderLoading, setSenderLoading] = useState(false);
    const [senderSaving, setSenderSaving] = useState(false);
    const [senderTesting, setSenderTesting] = useState(false);
    const [senderMessage, setSenderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        async function loadSenderConfig() {
            if (!fromUserId) {
                setSenderAddress("");
                setSenderName("");
                setSenderPassword("");
                setSenderConfigured(false);
                return;
            }

            setSenderLoading(true);
            setSenderMessage(null);

            try {
                const config = await getWorkspaceUserEmailConfig(fromUserId);
                setSenderAddress(config?.emailFromAddress || "");
                setSenderName(config?.emailFromName || "");
                setSenderPassword(config?.emailPassword || "");
                setSenderConfigured(config?.emailConfigured || false);
            } catch (error) {
                setSenderMessage({ type: "error", text: "No fue posible cargar la configuración del remitente" });
            } finally {
                setSenderLoading(false);
            }
        }

        loadSenderConfig();
    }, [fromUserId]);

    const focusEditor = () => {
        editorRef.current?.focus();
    };

    const applyCommand = (command: string, value?: string) => {
        focusEditor();
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setEmailBody(editorRef.current.innerHTML);
        }
    };

    const handleInsertLink = () => {
        const url = window.prompt("Ingresa la URL del enlace (https://...)");
        if (!url) return;
        applyCommand("createLink", url);
    };

    const insertSignatureImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "logo");
        formData.append("folder", "billing-signatures");

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        if (!response.ok || !data.url) {
            throw new Error(data.error || "No fue posible subir la imagen");
        }

        const imgHtml = `<img src="${data.url}" alt="Firma" style="max-width: 220px; height: auto; display: block; margin-top: 8px;" />`;
        applyCommand("insertHTML", imgHtml);
    };

    const handleSignatureFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setMessage(null);
            await insertSignatureImage(file);
            setMessage({ type: "success", text: "Imagen de firma insertada en la plantilla" });
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "No fue posible insertar la imagen de firma",
            });
        } finally {
            if (signatureInputRef.current) {
                signatureInputRef.current.value = "";
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const bodyHtml = editorRef.current?.innerHTML || emailBody;

            const result = await updateBillingConfig({
                enabled,
                emailsCC: emailsCC || null,
                emailsBCC: emailsBCC || null,
                emailSubject: emailSubject || defaultEmailSubject,
                emailBody: bodyHtml || normalizeBodyToHtml(defaultEmailBody),
                fromUserId: fromUserId || null,
            });

            if (result.error) {
                setMessage({ type: "error", text: result.error });
            } else {
                setMessage({ type: "success", text: "Configuración guardada exitosamente" });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Error al guardar la configuración" });
        }

        setSaving(false);
    };

    useEffect(() => {
        if (editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = emailBody;
        }
    }, [emailBody]);

    const handleSaveSenderConfig = async () => {
        if (!fromUserId) {
            setSenderMessage({ type: "error", text: "Selecciona un usuario remitente" });
            return;
        }
        if (!senderAddress || !senderName || !senderPassword) {
            setSenderMessage({ type: "error", text: "Completa correo, nombre y contraseña de aplicación" });
            return;
        }

        setSenderSaving(true);
        setSenderMessage(null);

        try {
            const result = await updateWorkspaceUserEmailConfig({
                userId: fromUserId,
                emailFromAddress: senderAddress,
                emailFromName: senderName,
                emailPassword: senderPassword,
            });

            if (result.error) {
                setSenderMessage({ type: "error", text: result.error });
            } else {
                setSenderConfigured(true);
                setSenderMessage({ type: "success", text: "Correo remitente guardado correctamente" });
            }
        } catch {
            setSenderMessage({ type: "error", text: "No fue posible guardar el correo remitente" });
        } finally {
            setSenderSaving(false);
        }
    };

    const handleTestSender = async () => {
        if (!fromUserId) {
            setSenderMessage({ type: "error", text: "Selecciona un usuario remitente para probar" });
            return;
        }

        setSenderTesting(true);
        setSenderMessage(null);
        try {
            const result = await testWorkspaceUserEmailConfig(fromUserId);
            setSenderMessage({
                type: result.success ? "success" : "error",
                text: result.message,
            });
        } catch {
            setSenderMessage({ type: "error", text: "No fue posible enviar el correo de prueba" });
        } finally {
            setSenderTesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Facturación Automática</CardTitle>
                        <p className="text-sm text-[var(--muted-text)] mt-1">
                            Configura el envío automático de proformas a clientes
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                        {message.text}
                    </div>
                )}

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-[var(--muted-text)]" />
                        <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                                Envío automático de proformas
                            </p>
                            <p className="text-xs text-[var(--muted-text)]">
                                Enviar proformas automáticamente según el día de cobro de cada empresa
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nearby-dark/15 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nearby-dark"></div>
                    </label>
                </div>

                {enabled && (
                    <>
                        {/* From User Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="fromUserId">Usuario remitente para facturación</Label>
                            <select
                                id="fromUserId"
                                value={fromUserId}
                                onChange={(e) => setFromUserId(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors"
                            >
                                <option value="">Seleccionar usuario...</option>
                                {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name || user.email} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-[var(--muted-text)]">
                                Selecciona el usuario cuyas credenciales de Gmail se usarán para el envío automático.
                            </p>
                            {availableUsers.length === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                    <Info size={16} />
                                    <span>No hay usuarios disponibles en este workspace.</span>
                                </div>
                            )}
                        </div>

                        {/* Sender email config section */}
                        {fromUserId && (
                            <div className="space-y-4 p-4 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--foreground)]">
                                            Correo de salida de facturación
                                        </p>
                                        <p className="text-xs text-[var(--muted-text)]">
                                            Configúralo igual que en Mi Perfil → Email (Gmail + contraseña de aplicación).
                                        </p>
                                    </div>
                                    {senderConfigured && (
                                        <Badge variant="success" className="w-fit">
                                            <CheckCircle size={12} className="mr-1" />
                                            Configurado
                                        </Badge>
                                    )}
                                </div>

                                {senderMessage && (
                                    <div className={`p-3 rounded-lg text-sm ${senderMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                        {senderMessage.text}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="billingSenderAddress">Email de Gmail</Label>
                                    <Input
                                        id="billingSenderAddress"
                                        type="email"
                                        value={senderAddress}
                                        onChange={(e) => setSenderAddress(e.target.value)}
                                        placeholder="facturacion@empresa.com"
                                        disabled={senderLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="billingSenderName">Nombre para mostrar</Label>
                                    <Input
                                        id="billingSenderName"
                                        type="text"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="Facturación Mi Empresa"
                                        disabled={senderLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="billingSenderPassword">Contraseña de aplicación</Label>
                                    <Input
                                        id="billingSenderPassword"
                                        type="password"
                                        value={senderPassword}
                                        onChange={(e) => setSenderPassword(e.target.value)}
                                        placeholder="•••• •••• •••• ••••"
                                        className="font-mono"
                                        disabled={senderLoading}
                                    />
                                    <p className="text-xs text-[var(--muted-text)]">
                                        Genera una en{" "}
                                        <a
                                            href="https://myaccount.google.com/apppasswords"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--foreground)] font-medium hover:underline"
                                        >
                                            myaccount.google.com/apppasswords
                                        </a>
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button onClick={handleSaveSenderConfig} disabled={senderSaving || senderLoading} className="w-full sm:w-auto">
                                        {senderSaving ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} />
                                                Guardar correo remitente
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleTestSender}
                                        disabled={senderTesting || senderLoading || !senderConfigured}
                                        className="w-full sm:w-auto"
                                    >
                                        {senderTesting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Probando...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} />
                                                Probar envío
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* CC Emails */}
                        <div className="space-y-2">
                            <Label htmlFor="emailsCC">Correos en copia (CC)</Label>
                            <Input
                                type="text"
                                id="emailsCC"
                                value={emailsCC}
                                onChange={(e) => setEmailsCC(e.target.value)}
                                placeholder="admin@empresa.com, contabilidad@empresa.com"
                            />
                            <p className="text-xs text-[var(--muted-text)]">
                                Separar múltiples correos con coma. Estos recibirán copia de todas las proformas.
                            </p>
                        </div>

                        {/* BCC Emails */}
                        <div className="space-y-2">
                            <Label htmlFor="emailsBCC">Correos en copia oculta (BCC)</Label>
                            <Input
                                type="text"
                                id="emailsBCC"
                                value={emailsBCC}
                                onChange={(e) => setEmailsBCC(e.target.value)}
                                placeholder="archivo@empresa.com"
                            />
                        </div>

                        {/* Email Subject */}
                        <div className="space-y-2">
                            <Label htmlFor="emailSubject">Asunto del email</Label>
                            <Input
                                type="text"
                                id="emailSubject"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder={defaultEmailSubject}
                            />
                        </div>

                        {/* Email Body */}
                        <div className="space-y-2">
                            <Label htmlFor="emailBody">Cuerpo del email</Label>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 p-2 border border-[var(--card-border)] rounded-lg bg-[var(--hover-bg)]">
                                    <Button type="button" variant="secondary" size="sm" onClick={() => applyCommand("bold")}>
                                        <Bold size={14} />
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => applyCommand("italic")}>
                                        <Italic size={14} />
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => applyCommand("underline")}>
                                        <Underline size={14} />
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => applyCommand("insertUnorderedList")}>
                                        <List size={14} />
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => applyCommand("insertOrderedList")}>
                                        <ListOrdered size={14} />
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={handleInsertLink}>
                                        <Link2 size={14} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => signatureInputRef.current?.click()}
                                    >
                                        <ImagePlus size={14} />
                                        Imagen firma
                                    </Button>
                                    <input
                                        ref={signatureInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        onChange={handleSignatureFileChange}
                                    />
                                </div>

                                <div
                                    id="emailBody"
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={(e) => setEmailBody((e.currentTarget as HTMLDivElement).innerHTML)}
                                    className="min-h-[260px] w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] shadow-sm focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors overflow-auto"
                                />
                                <p className="text-xs text-[var(--muted-text)]">
                                    Usa Enter para saltos de línea. Puedes aplicar negritas, listas, enlaces e insertar imagen en la firma.
                                </p>
                            </div>
                        </div>

                        {/* Variables Info */}
                        <div className="p-4 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]">
                            <p className="text-sm font-medium text-[var(--foreground)] mb-2">Variables disponibles:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="secondary">{"{{EMPRESA}}"}</Badge>
                                <Badge variant="secondary">{"{{MES}}"}</Badge>
                                <Badge variant="secondary">{"{{AÑO}}"}</Badge>
                                <Badge variant="secondary">{"{{NUMERO_PROFORMA}}"}</Badge>
                                <Badge variant="secondary">{"{{PROVEEDOR_NOMBRE}}"}</Badge>
                                <Badge variant="secondary">{"{{CLIENTE_RNC}}"}</Badge>
                                <Badge variant="secondary">{"{{TOTAL}}"}</Badge>
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p className="font-medium mb-2">¿Cómo funciona?</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Cada empresa tiene un "día de cobro" configurado en su pestaña de Suscripción</li>
                                <li>El día indicado, se crea automáticamente una proforma en ADMCloud</li>
                                <li>Se genera el PDF y se envía a los contactos marcados como "Recibe facturas"</li>
                                <li>Los correos CC configurados aquí reciben copia de todas las proformas</li>
                            </ul>
                        </div>
                    </>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-[var(--card-border)]">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar Configuración
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
