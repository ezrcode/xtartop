"use client";

import { useState } from "react";
import { Save, Loader2, Receipt, Mail, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { updateBillingConfig } from "@/actions/billing-config";

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

export function BillingConfigTab({ currentConfig, availableUsers }: BillingConfigProps) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [enabled, setEnabled] = useState(currentConfig.enabled);
    const [emailsCC, setEmailsCC] = useState(currentConfig.emailsCC || "");
    const [emailsBCC, setEmailsBCC] = useState(currentConfig.emailsBCC || "");
    const [emailSubject, setEmailSubject] = useState(currentConfig.emailSubject || defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(currentConfig.emailBody || defaultEmailBody);
    const [fromUserId, setFromUserId] = useState(currentConfig.fromUserId || "");

    const usersWithEmail = availableUsers.filter(u => u.emailConfigured);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const result = await updateBillingConfig({
                enabled,
                emailsCC: emailsCC || null,
                emailsBCC: emailsBCC || null,
                emailSubject: emailSubject || defaultEmailSubject,
                emailBody: emailBody || defaultEmailBody,
                fromUserId: fromUserId || null,
            });

            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else {
                setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        }

        setSaving(false);
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
                    <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                        {message.text}
                    </div>
                )}

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)]">
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-nearby-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nearby-accent"></div>
                    </label>
                </div>

                {enabled && (
                    <>
                        {/* From User Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="fromUserId">Usuario remitente</Label>
                            <select
                                id="fromUserId"
                                value={fromUserId}
                                onChange={(e) => setFromUserId(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                            >
                                <option value="">Seleccionar usuario...</option>
                                {usersWithEmail.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name || user.email} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-[var(--muted-text)]">
                                Solo se muestran usuarios con email configurado. Los emails se enviarán desde su cuenta.
                            </p>
                            {usersWithEmail.length === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                    <Info size={16} />
                                    <span>No hay usuarios con email configurado. Ve a Mi Perfil → Email para configurar.</span>
                                </div>
                            )}
                        </div>

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
                            <textarea
                                id="emailBody"
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                rows={10}
                                placeholder={defaultEmailBody}
                                className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none font-mono"
                            />
                        </div>

                        {/* Variables Info */}
                        <div className="p-4 bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)]">
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
                        <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
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
