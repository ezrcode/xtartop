"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Save, UserPlus, Mail, Trash2, X, Building2, Users2, FileText, Loader2, Cloud } from "lucide-react";
import { ImageUpload } from "../ui/image-upload";
import {
    updateWorkspace,
    sendInvitation,
    revokeInvitation,
    removeMember,
    updateContractTemplate,
    WorkspaceState,
    InvitationState
} from "@/actions/workspace";
import type { Workspace, WorkspaceMember, Invitation, User, Subscription } from "@prisma/client";
import { AdmCloudConfigTab } from "./admcloud-config-tab";
import { ClickUpConfigTab } from "./clickup-config-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

type WorkspaceWithDetails = Workspace & {
    owner: Pick<User, 'id' | 'name' | 'email' | 'photoUrl'>;
    members: (WorkspaceMember & {
        user: Pick<User, 'id' | 'name' | 'email' | 'photoUrl'>;
    })[];
    invitations: (Invitation & {
        inviter: Pick<User, 'name' | 'email'>;
    })[];
    subscription: Subscription | null;
    contractTemplate?: string | null;
    contractVersion?: string | null;
    // AdmCloud config
    admCloudEnabled?: boolean;
    admCloudAppId?: string | null;
    admCloudUsername?: string | null;
    admCloudPassword?: string | null;
    admCloudCompany?: string | null;
    admCloudRole?: string | null;
    admCloudDefaultPriceListId?: string | null;
    admCloudDefaultPriceListName?: string | null;
    // ClickUp config
    clickUpEnabled?: boolean;
    clickUpApiToken?: string | null;
    clickUpWorkspaceId?: string | null;
    clickUpListId?: string | null;
    clickUpClientFieldId?: string | null;
    _count: {
        contacts: number;
        companies: number;
        deals: number;
    };
};

interface SettingsPageProps {
    workspace: WorkspaceWithDetails;
}

function getDefaultContractTemplate(): string {
    return `<h2 style="text-align: center;">Contrato de Términos y Condiciones de Uso Nearby CRM</h2>

<hr/>

<p><strong>DE UNA PARTE:</strong> La sociedad NEARBY PROPTECH SOLUTIONS, S.A.S., sociedad comercial organizada bajo las leyes de la República Dominicana, RNC 1-3253017-9, con domicilio en la Av. John F. Kennedy No. 88, sector Jardines del Norte, Santo Domingo, República Dominicana. Parte que en lo sucesivo del presente contrato se denominará <strong>LA PRIMERA PARTE</strong>.</p>

<p><strong>DE LA OTRA PARTE:</strong> La persona física o jurídica cuyos datos de identidad, Registro Nacional de Contribuyentes (RNC) o documento equivalente, domicilio, y datos de su representante legal (nombre, nacionalidad y documento de identidad) han sido completados en el formulario de registro de la plataforma y/o constan en la Cotización N° <strong>{{ID_COTIZACION}}</strong>, parte que en lo sucesivo del presente contrato se denominará <strong>LA SEGUNDA PARTE</strong>.</p>

<p>Cuando sean referidos conjuntamente se denominarán <strong>LAS PARTES</strong>. Este Contrato constituye la totalidad del acuerdo y prevalece sobre convenios previos.</p>

<p><strong>POR CUANTO:</strong> LA SEGUNDA PARTE tiene el interés de contratar a LA PRIMERA PARTE para los servicios de implementación, soporte y mantenimiento de la plataforma "Nearby CRM". <strong>POR LO TANTO</strong>, las partes han convenido lo siguiente:</p>

<hr/>

<h4>Objeto del Contrato</h4>
<p>LA PRIMERA PARTE es contratada para implementar y dar soporte a "Nearby CRM" con la finalidad de gestionar transacciones comerciales, proyectos inmobiliarios o unidades, de acuerdo con las condiciones definidas en la propuesta técnica y económica recibida y aceptada por LA SEGUNDA PARTE, la cual se identifica como Cotización N° <strong>{{ID_COTIZACION}}</strong>.</p>

<h4>Alcance del Contrato</h4>
<p>Los servicios comprenden la gestión de implementación, soporte y mantenimiento exclusivamente para incidencias en arquitectura, configuración, desarrollo y reporting de Nearby CRM, ajustada al plan contratado según la Cotización N° <strong>{{ID_COTIZACION}}</strong>.</p>

<h4>Manejo de Solicitudes y Garantía</h4>
<p>El soporte se gestionará mediante tickets, disponibles 24/7. Si LA SEGUNDA PARTE dura más de 48 horas calendario realizando pruebas tras una atención, el servicio se considerará entregado. No se realizarán reembolsos después de ejecutado el setup. La garantía cubre fallas técnicas por uso correcto y no cubre daños por uso indebido.</p>
<p>Las incidencias se tratarán de forma independiente y secuencial, priorizando desde Fallas en la instancia (Prioridad 1) hasta fallas de un solo usuario (Prioridad 4).</p>
<p><strong>PÁRRAFO II:</strong> No se incluyen desarrollos nuevos o personalizaciones adicionales a lo establecido en la Cotización N° <strong>{{ID_COTIZACION}}</strong>. Requerimientos adicionales serán cotizados por horas de servicio.</p>
<p><strong>PÁRRAFO III:</strong> El servicio comprende la cantidad de usuarios, proyectos e instancias definidos en la Cotización N° <strong>{{ID_COTIZACION}}</strong>, incluyendo backups, actualizaciones, soporte y capacitación.</p>

<h4>Acuerdo Económico y Forma de Pago</h4>
<p>LA SEGUNDA PARTE pagará a LA PRIMERA PARTE por los servicios referidos, las sumas de los importes contratados según la Cotización N° <strong>{{ID_COTIZACION}}</strong>, tanto para la implementación como para la suscripción mensual, de acuerdo con los plazos, condiciones y formas de pago establecidos en dicha propuesta.</p>
<p>La facturación se realizará de forma automática mensualmente los días uno (1) de cada mes. El pago deberá realizarse sin falta dentro de los primeros cinco (5) días continuos a la facturación, mediante transferencia bancaria o medio de pago establecido por LA PRIMERA PARTE, en las cuentas bancarias indicadas en la facturación, a la tasa de cambio vigente indicada en la factura cuando sea en moneda local.</p>
<p><strong>PÁRRAFO II:</strong> Habrá un incremento en la mensualidad cuando se soliciten nuevos usuarios, proyectos o instancias, las cuales serán cobradas al precio de lista actual que se encuentre a la fecha de la solicitud. Los usuarios y proyectos adicionales se incluirán o reducirán de la facturación recurrente al momento de su activación o desactivación.</p>
<p><strong>PÁRRAFO III:</strong> El sistema realizará un bloqueo automático tras cinco (5) días laborables de mora hasta que se salde la deuda.</p>

<h4>Duración del Contrato</h4>
<p>La duración del presente contrato se mantendrá vigente de mes a mes mientras LA SEGUNDA PARTE mantenga activa su suscripción mensual. LA SEGUNDA PARTE podrá cancelar el servicio en cualquier momento, siempre que su cuenta esté al día. En caso de cancelación en medio de un mes ya facturado, la suscripción permanecerá activa hasta el siguiente corte (día 1 del mes siguiente).</p>

<h4>Terminación Del Contrato</h4>
<p>Cualquiera de LAS PARTES podrá solicitar la resolución de este contrato, cuando alguna haya incumplido las obligaciones contraídas en él, según lo dispuesto a continuación:</p>
<p><u>Son causas de terminación del Contrato por LA PRIMERA PARTE:</u></p>
<ol>
<li>Demora de LA SEGUNDA PARTE en el pago por más de treinta (30) días desde la fecha de facturación correspondiente.</li>
<li>Incumplimiento a las obligaciones de confidencialidad, pactadas entre LAS PARTES.</li>
<li>Incumplimiento de las obligaciones contractuales asumidas por LA SEGUNDA PARTE.</li>
<li>Cuando LA SEGUNDA PARTE ha sido declarada en quiebra o atraso, o se disuelve la sociedad sin antes haber traspasado el Contrato previo acuerdo entre LAS PARTES, de conformidad con los procesos estipulados en este Contrato.</li>
</ol>
<p>De comprobarse e imputarse alguna de estas causas, se procederá a efectuar el cálculo de los servicios no pagados y suministrados por LA PRIMERA PARTE que deberán ser pagados por LA SEGUNDA PARTE en un plazo no mayor a treinta (30) días contados a partir de la notificación realizada por este concepto.</p>
<p><u>Son causas de terminación del Contrato por LA SEGUNDA PARTE:</u></p>
<ol>
<li>Cuando LA PRIMERA PARTE ha sido declarada en quiebra o atraso, o se disuelve la sociedad sin antes haber traspasado el contrato previo acuerdo entre LAS PARTES.</li>
<li>Incumplimiento a las obligaciones de confidencialidad, pactadas entre LAS PARTES.</li>
<li>Incumplimiento de las obligaciones contractuales asumidas por LA PRIMERA PARTE, en la forma establecida en este acto.</li>
</ol>

<h4>Confidencialidad</h4>
<p>LAS PARTES mediante este contrato se comprometen a mantener toda la información recibida e intercambiada entre las mismas bajo estricta confidencialidad y utilizará los mismos niveles de cuidado para impedir su divulgación o el uso no autorizado de la misma por sus directores, funcionarios, empleados, agentes, asesores (incluyendo, pero no limitándose a abogados, contadores, consultores, banqueros y asesores financieros) en cualquier medio o forma. El compromiso de confidencialidad mantendrá su vigencia inclusive hasta después de la terminación del presente contrato.</p>
<p>Se exceptúa de este compromiso de confidencialidad aquella información que: (i) sea de dominio público, (ii) se haga de dominio público por causas no atribuibles a algunas de LAS PARTES, (iii) fuera requerida a cualquiera de las partes por alguna autoridad pública con competencia para hacerlo, caso en el cual se le debe de comunicar a la otra Parte el requerimiento de información para que estos puedan tomar las medidas necesarias para preservar la confidencialidad de la información, o (iv) exista autorización escrita de la otra Parte para su divulgación.</p>
<p>Los documentos, recopilaciones de datos, informes, programas informáticos, fotografías y cualquier otro trabajo proporcionado o producido para la ejecución de este contrato serán mantenidos confidenciales por LA SEGUNDA PARTE y su personal, a menos que haya una aprobación previa y por escrito de LA PRIMERA PARTE. A la terminación de este contrato, LA SEGUNDA PARTE deberá devolver toda información o documentación suministrada por LA PRIMERA PARTE para la ejecución de los servicios, y adicionalmente destruir cualquier copias o reproducciones que mantenga en su poder LA SEGUNDA PARTE.</p>

<h4>No Cesión</h4>
<p>LA SEGUNDA PARTE no podrá ceder este contrato sin consentimiento previo. LA PRIMERA PARTE puede cederlo a terceros o afiliadas sin previo aviso.</p>

<h4>Caso Fortuito</h4>
<p>Ninguna parte será responsable por eventos de fuerza mayor (catástrofes, huelgas, ataques externos) que impidan la prestación del servicio.</p>

<h4>Anti Corrupción y Prevención de Lavado y Financiamiento del Terrorismo</h4>
<p>LAS PARTES aceptan y se obligan a no llevar a cabo ninguna práctica que pueda ser considerada como corruptible con los funcionarios de la otra Parte, de funcionarios públicos u otros oficiales de orden público o privado. Del mismo modo, declaran realizar esfuerzos razonables para asegurar: 1) que ninguno de los fondos recibidos y/o servicios prestados tiene origen en alguna actividad considerada como delictiva, ni se utilizarán para apoyar personas o entidades asociadas con el terrorismo y 2) que sus beneficiarios finales u otros destinatarios de cualquier cantidad de dinero o servicio, no figura en las listas de entidades u organizaciones que identifiquen a personas como participantes, colaboradores o facilitadores del crimen organizado como la que mantiene el Comité del Consejo de Seguridad de la ONU, o la OFAC (Office of Foreign Assets Control), y afines. En caso de que se compruebe alguno de los prenombrados comportamientos, la Parte ofendida tendrá motivo justificado para dar por terminado sin responsabilidad, el presente Contrato.</p>

<h4>Ley Aplicable</h4>
<p>LAS PARTES hacen elección de domicilio en sus respectivos domicilios indicados al inicio de este Contrato. Asimismo, LAS PARTES aceptan todas las estipulaciones y convenciones del presente Contrato bajo el entendido de que el mismo estará regido y deberá ser interpretado de conformidad con las leyes de la República Dominicana. Para todo lo no acordado en el presente contrato, LAS PARTES se remiten al derecho común.</p>

<hr/>

<h3>DATOS DEL CLIENTE</h3>
<ul>
<li><strong>Razón Social:</strong> {{CLIENTE_RAZON_SOCIAL}}</li>
<li><strong>RNC:</strong> {{CLIENTE_RNC}}</li>
<li><strong>Dirección:</strong> {{CLIENTE_DIRECCION}}</li>
<li><strong>Representante:</strong> {{CLIENTE_REPRESENTANTE}}</li>
</ul>

<hr/>

<p style="margin-top: 30px;"><strong>ACEPTACIÓN:</strong></p>
<p>He leído y acepto los Términos y Condiciones de Uso de la plataforma Nearby CRM y la Cotización N° <strong>{{ID_COTIZACION}}</strong> vinculada a mi cuenta. Entiendo que esta aceptación digital tiene la misma validez legal que una firma manuscrita de acuerdo con la legislación vigente.</p>`;
}

type Tab = 'workspace' | 'team' | 'contract' | 'integrations';

export function SettingsPage({ workspace }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState<Tab>('workspace');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logoUrl || null);
    
    // Contract state
    const [contractContent, setContractContent] = useState(workspace.contractTemplate || getDefaultContractTemplate());
    const [contractVersion, setContractVersion] = useState(workspace.contractVersion || "v1.0");
    const [savingContract, setSavingContract] = useState(false);
    const [contractMessage, setContractMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const initialWorkspaceState: WorkspaceState = { message: "", errors: {} };
    const initialInvitationState: InvitationState = { message: "", errors: {} };

    const [workspaceState, workspaceAction] = useFormState(updateWorkspace, initialWorkspaceState);
    const [invitationState, invitationAction] = useFormState(sendInvitation, initialInvitationState);

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            const names = name.split(" ");
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        setRevokingId(invitationId);
        await revokeInvitation(invitationId);
        setRevokingId(null);
    };

    const handleRemoveMember = async (memberId: string) => {
        setRemovingId(memberId);
        await removeMember(memberId);
        setRemovingId(null);
    };

    const totalMembers = workspace.members.length + 1; // +1 for owner
    const canAddMembers = totalMembers < 5;

    const handleSaveContract = async () => {
        setSavingContract(true);
        setContractMessage(null);
        
        try {
            const result = await updateContractTemplate(contractContent, contractVersion);
            if (result.error) {
                setContractMessage({ type: 'error', text: result.error });
            } else {
                setContractMessage({ type: 'success', text: 'Contrato guardado exitosamente' });
            }
        } catch (err) {
            setContractMessage({ type: 'error', text: 'Error al guardar el contrato' });
        }
        
        setSavingContract(false);
    };

    return (
        <div className="min-h-screen bg-[var(--background)] py-6 sm:py-8 overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Configuración</h1>
                    <p className="text-sm sm:text-base text-[var(--muted-text)] mt-1 sm:mt-2">
                        Gestiona tu workspace, equipo y configuraciones
                    </p>
                </div>

                <Tabs defaultValue="workspace" value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
                    {/* Tabs - iOS optimized: icons only on mobile */}
                    <TabsList variant="underline" className="w-full justify-between sm:justify-start mb-6 border-[var(--card-border)]">
                        <TabsTrigger value="workspace" variant="underline" className="flex-1 sm:flex-none">
                            <Building2 size={18} />
                            <span className="hidden sm:inline">Espacio</span>
                        </TabsTrigger>
                        <TabsTrigger value="team" variant="underline" className="flex-1 sm:flex-none">
                            <Users2 size={18} />
                            <span className="hidden sm:inline">Equipo</span>
                        </TabsTrigger>
                        <TabsTrigger value="contract" variant="underline" className="flex-1 sm:flex-none">
                            <FileText size={18} />
                            <span className="hidden sm:inline">Contrato</span>
                        </TabsTrigger>
                        <TabsTrigger value="integrations" variant="underline" className="flex-1 sm:flex-none">
                            <Cloud size={18} />
                            <span className="hidden sm:inline">Integraciones</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab Content: Workspace */}
                    <TabsContent value="workspace" className="mt-0">
                    <div className="space-y-6">
                        {/* Workspace Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Información del Workspace</CardTitle>
                            </CardHeader>
                            <CardContent>
                            
                            <form action={workspaceAction} className="space-y-6">
                                {workspaceState?.message && (
                                    <div className={`p-4 rounded-md ${workspaceState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                        {workspaceState.message}
                                    </div>
                                )}

                                {/* Logo Upload */}
                                <ImageUpload
                                    currentImage={workspace.logoUrl}
                                    onImageChange={(url) => setLogoUrl(url)}
                                    category="logo"
                                    folder="logos"
                                    size="lg"
                                    shape="square"
                                    label="Logo de la Empresa"
                                />
                                <input type="hidden" name="logoUrl" value={logoUrl || ""} />

                                {/* Form fields - stacked on mobile, grid on desktop */}
                                <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre del Workspace</Label>
                                        <Input
                                            type="text"
                                            name="name"
                                            id="name"
                                            defaultValue={workspace.name}
                                            required
                                            error={!!workspaceState?.errors?.name}
                                        />
                                        {workspaceState?.errors?.name && (
                                            <p className="text-sm text-error-red">{workspaceState.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="legalName">Nombre o Razón Social</Label>
                                        <Input
                                            type="text"
                                            name="legalName"
                                            id="legalName"
                                            defaultValue={workspace.legalName || ''}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="rnc">RNC</Label>
                                        <Input
                                            type="text"
                                            name="rnc"
                                            id="rnc"
                                            defaultValue={workspace.rnc || ''}
                                            placeholder="000-0000000-0"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input
                                            type="tel"
                                            name="phone"
                                            id="phone"
                                            defaultValue={workspace.phone || ''}
                                            placeholder="+1 (809) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="address">Dirección</Label>
                                    <textarea
                                        name="address"
                                        id="address"
                                        rows={2}
                                        defaultValue={workspace.address || ''}
                                        placeholder="Calle, Número, Sector, Ciudad, País"
                                        className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none"
                                    />
                                </div>

                                <div className="space-y-2 mt-4">
                                    <Label>Plan</Label>
                                    <div className="px-3 py-2.5 bg-[var(--hover-bg)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--foreground)]">
                                        <Badge variant="primary">{workspace.subscription?.plan || "FREE"}</Badge>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit">
                                        <Save size={16} />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </form>
                            </CardContent>
                        </Card>
                    </div>
                    </TabsContent>

                    {/* Tab Content: Contract */}
                    <TabsContent value="contract" className="mt-0">
                    <div className="space-y-6">
                        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                            <h2 className="text-lg font-semibold text-nearby-dark mb-2">Plantilla del Contrato</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Este es el texto que verán los clientes al aceptar los Términos y Condiciones.
                                Puedes usar las siguientes variables que se reemplazarán automáticamente:
                            </p>
                            
                            <div className="mb-6 p-4 bg-soft-gray rounded-lg">
                                <p className="text-sm font-medium text-dark-slate mb-2">Variables disponibles:</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                                    <code className="bg-white px-2 py-1 rounded">{"{{CLIENTE_RAZON_SOCIAL}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{CLIENTE_RNC}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{CLIENTE_DIRECCION}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{CLIENTE_REPRESENTANTE}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{PROYECTOS_INICIALES}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{USUARIOS_INICIALES}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{ID_COTIZACION}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{PROVEEDOR_NOMBRE}}"}</code>
                                    <code className="bg-white px-2 py-1 rounded">{"{{FECHA_ACTUAL}}"}</code>
                                </div>
                            </div>

                            {contractMessage && (
                                <div className={`p-4 rounded-md mb-6 ${contractMessage.type === 'success' ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                    {contractMessage.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="contractVersion" className="block text-sm font-medium text-dark-slate mb-2">
                                        Versión del Contrato
                                    </label>
                                    <input
                                        type="text"
                                        id="contractVersion"
                                        value={contractVersion}
                                        onChange={(e) => setContractVersion(e.target.value)}
                                        placeholder="v1.0"
                                        className="w-full max-w-xs px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contractContent" className="block text-sm font-medium text-dark-slate mb-2">
                                        Contenido del Contrato (HTML)
                                    </label>
                                    <textarea
                                        id="contractContent"
                                        value={contractContent}
                                        onChange={(e) => setContractContent(e.target.value)}
                                        rows={20}
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm font-mono text-xs"
                                        placeholder="Ingrese el contenido del contrato..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Puedes usar etiquetas HTML para dar formato: &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, etc.
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-graphite-gray">
                                    <button
                                        type="button"
                                        onClick={() => setContractContent(getDefaultContractTemplate())}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Restaurar plantilla por defecto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveContract}
                                        disabled={savingContract}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        {savingContract ? (
                                            <>
                                                <Loader2 size={16} className="mr-2 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} className="mr-2" />
                                                Guardar Contrato
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-8 pt-6 border-t border-graphite-gray">
                                <h3 className="text-sm font-medium text-dark-slate mb-4">Vista Previa</h3>
                                <div className="bg-soft-gray border border-graphite-gray rounded-md p-6 max-h-96 overflow-y-auto">
                                    <div 
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: contractContent }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    </TabsContent>

                    {/* Tab Content: Team */}
                    <TabsContent value="team" className="mt-0">
                    <div className="space-y-6">
                        {/* Team Management */}
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg">Equipo</CardTitle>
                                        <p className="text-sm text-[var(--muted-text)] mt-1">
                                            {totalMembers} de 5 miembros (Plan FREE)
                                        </p>
                                    </div>
                                    {canAddMembers && (
                                        <Button
                                            onClick={() => setShowInviteForm(!showInviteForm)}
                                            className="w-full sm:w-auto"
                                        >
                                            <UserPlus size={16} />
                                            Invitar
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                            {/* Invite Form */}
                            {showInviteForm && (
                                <form action={invitationAction} className="mb-6 p-4 bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)]">
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-sm font-medium text-[var(--foreground)]">Nueva Invitación</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteForm(false)}
                                            className="text-[var(--muted-text)] hover:text-[var(--foreground)] p-1"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {invitationState?.message && (
                                        <div className={`p-3 rounded-xl mb-4 text-sm ${invitationState.message.includes("success") ? "bg-success-green/10 text-success-green" : "bg-error-red/10 text-error-red"}`}>
                                            {invitationState.message}
                                        </div>
                                    )}

                                    {/* Stacked on mobile */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                type="email"
                                                name="email"
                                                id="email"
                                                placeholder="miembro@email.com"
                                                required
                                                error={!!invitationState?.errors?.email}
                                            />
                                            {invitationState?.errors?.email && (
                                                <p className="text-sm text-error-red">{invitationState.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="role">Rol</Label>
                                            <select
                                                name="role"
                                                id="role"
                                                defaultValue="MEMBER"
                                                className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            >
                                                <option value="MEMBER">Miembro</option>
                                                <option value="ADMIN">Administrador</option>
                                                <option value="VIEWER">Solo lectura</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <Button type="submit" className="w-full sm:w-auto">
                                            <Mail size={16} />
                                            Enviar Invitación
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Members List */}
                            <div className="space-y-3 overflow-hidden">
                                <h3 className="text-sm font-medium text-[var(--foreground)]">Miembros Activos</h3>
                                
                                {/* Owner */}
                                <div className="flex items-center gap-2 p-3 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] overflow-hidden">
                                    {workspace.owner.photoUrl ? (
                                        <img
                                            src={workspace.owner.photoUrl}
                                            alt={workspace.owner.name || ""}
                                            className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-dark flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                            {getInitials(workspace.owner.name, workspace.owner.email)}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                            {workspace.owner.name || workspace.owner.email}
                                        </p>
                                        <p className="text-xs text-[var(--muted-text)] truncate">{workspace.owner.email}</p>
                                    </div>
                                    <Badge variant="secondary" className="flex-shrink-0 text-xs">Owner</Badge>
                                </div>

                                {/* Members */}
                                {workspace.members.map((member) => (
                                    <div key={member.id} className="flex items-center gap-2 p-3 border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] overflow-hidden">
                                        {member.user.photoUrl ? (
                                            <img
                                                src={member.user.photoUrl}
                                                alt={member.user.name || ""}
                                                className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-dark flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                {getInitials(member.user.name, member.user.email)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                                {member.user.name || member.user.email}
                                            </p>
                                            <p className="text-xs text-[var(--muted-text)] truncate">{member.user.email}</p>
                                        </div>
                                        <Badge variant={member.role === 'ADMIN' ? 'info' : 'success'} className="flex-shrink-0 text-xs">
                                            {member.role}
                                        </Badge>
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={removingId === member.id || member.user.id === workspace.owner.id}
                                            className="text-error-red hover:text-red-700 disabled:opacity-50 p-1 flex-shrink-0"
                                            title={member.user.id === workspace.owner.id ? "No se puede eliminar al Owner" : "Eliminar"}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Invitations */}
                            {workspace.invitations.length > 0 && (
                                <div className="mt-6 space-y-3 overflow-hidden">
                                    <h3 className="text-sm font-medium text-[var(--foreground)]">Invitaciones Pendientes</h3>
                                    {workspace.invitations.map((invitation) => (
                                        <div key={invitation.id} className="flex items-center gap-2 p-3 border border-dashed border-[var(--card-border)] rounded-xl bg-[var(--hover-bg)] overflow-hidden">
                                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-[var(--card-border)] flex items-center justify-center text-[var(--muted-text)]">
                                                <Mail size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[var(--foreground)] truncate">{invitation.email}</p>
                                                <p className="text-xs text-[var(--muted-text)] truncate">
                                                    Por {invitation.inviter.name || invitation.inviter.email}
                                                </p>
                                            </div>
                                            <Badge variant="warning" className="flex-shrink-0 text-xs">Pendiente</Badge>
                                            <button
                                                onClick={() => handleRevokeInvitation(invitation.id)}
                                                disabled={revokingId === invitation.id}
                                                className="text-error-red hover:text-red-700 disabled:opacity-50 p-1 flex-shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </CardContent>
                        </Card>
                    </div>
                    </TabsContent>

                    {/* Tab Content: Integrations */}
                    <TabsContent value="integrations" className="mt-0 space-y-6">
                        <AdmCloudConfigTab 
                            currentConfig={{
                                enabled: workspace.admCloudEnabled || false,
                                appId: workspace.admCloudAppId || null,
                                username: workspace.admCloudUsername || null,
                                password: workspace.admCloudPassword || null,
                                company: workspace.admCloudCompany || null,
                                role: workspace.admCloudRole || null,
                                defaultPriceListId: workspace.admCloudDefaultPriceListId || null,
                                defaultPriceListName: workspace.admCloudDefaultPriceListName || null,
                            }}
                        />
                        <ClickUpConfigTab 
                            currentConfig={{
                                enabled: workspace.clickUpEnabled || false,
                                apiToken: workspace.clickUpApiToken || null,
                                workspaceId: workspace.clickUpWorkspaceId || null,
                                listId: workspace.clickUpListId || null,
                                clientFieldId: workspace.clickUpClientFieldId || null,
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
