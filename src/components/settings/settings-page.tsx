"use client";

import { useState, useRef } from "react";
import { useFormState } from "react-dom";
import { Save, UserPlus, Mail, Trash2, X, Building2, Users2, Upload, FileText, Loader2 } from "lucide-react";
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
    return `<h3>CONTRATO DE SERVICIOS</h3>

<p>Entre las partes:</p>

<p><strong>PROVEEDOR:</strong> {{PROVEEDOR_NOMBRE}}</p>

<p><strong>CLIENTE:</strong><br/>
Razón Social: {{CLIENTE_RAZON_SOCIAL}}<br/>
RNC: {{CLIENTE_RNC}}<br/>
Dirección: {{CLIENTE_DIRECCION}}<br/>
Representado por: {{CLIENTE_REPRESENTANTE}}</p>

<hr/>

<h4>CLÁUSULA PRIMERA: OBJETO</h4>
<p>El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales el PROVEEDOR prestará servicios al CLIENTE, incluyendo:</p>
<ul>
<li>Proyectos contratados: <strong>{{PROYECTOS_INICIALES}}</strong></li>
<li>Usuarios contratados: <strong>{{USUARIOS_INICIALES}}</strong></li>
</ul>

<h4>CLÁUSULA SEGUNDA: OBLIGACIONES DEL CLIENTE</h4>
<p>El CLIENTE se compromete a:</p>
<ul>
<li>Proporcionar información veraz y actualizada</li>
<li>Cumplir con los pagos acordados en tiempo y forma</li>
<li>Notificar cualquier cambio en sus datos de contacto</li>
</ul>

<h4>CLÁUSULA TERCERA: CONFIDENCIALIDAD</h4>
<p>Ambas partes se comprometen a mantener la confidencialidad de toda información compartida durante la vigencia de este contrato.</p>

<h4>CLÁUSULA CUARTA: VIGENCIA</h4>
<p>Este contrato entrará en vigor a partir de la fecha de aceptación ({{FECHA_ACTUAL}}) y tendrá una duración indefinida hasta que alguna de las partes decida terminarlo con previo aviso de 30 días.</p>

<h4>CLÁUSULA QUINTA: RESOLUCIÓN DE CONFLICTOS</h4>
<p>Cualquier disputa que surja de este contrato será resuelta mediante arbitraje en la jurisdicción correspondiente.</p>`;
}

type Tab = 'workspace' | 'team' | 'contract';

export function SettingsPage({ workspace }: SettingsPageProps) {
    const [activeTab, setActiveTab] = useState<Tab>('workspace');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(workspace.logoUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Contract state
    const [contractContent, setContractContent] = useState(workspace.contractTemplate || getDefaultContractTemplate());
    const [contractVersion, setContractVersion] = useState(workspace.contractVersion || "v1.0");
    const [savingContract, setSavingContract] = useState(false);
    const [contractMessage, setContractMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const initialWorkspaceState: WorkspaceState = { message: "", errors: {} };
    const initialInvitationState: InvitationState = { message: "", errors: {} };

    const [workspaceState, workspaceAction] = useFormState(updateWorkspace, initialWorkspaceState);
    const [invitationState, invitationAction] = useFormState(sendInvitation, initialInvitationState);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple file upload to public/uploads
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const { filePath } = await response.json();
                setLogoPreview(filePath);
                
                // Update hidden input with the file path
                const logoInput = document.getElementById('logoUrl') as HTMLInputElement;
                if (logoInput) {
                    logoInput.value = filePath;
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al subir el logo');
        }
    };

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

    const tabs = [
        { id: 'workspace' as Tab, name: 'Espacio de trabajo', icon: Building2 },
        { id: 'team' as Tab, name: 'Equipo', icon: Users2 },
        { id: 'contract' as Tab, name: 'Contrato', icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-nearby-dark">Configuración</h1>
                    <p className="text-sm sm:text-base text-dark-slate mt-2">
                        Gestiona tu workspace, equipo y configuraciones
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-graphite-gray">
                        <nav className="-mb-px flex space-x-8">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-nearby-accent text-nearby-accent'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <Icon size={18} className="mr-2" />
                                        {tab.name}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'workspace' && (
                    <div className="space-y-6">
                        {/* Workspace Info */}
                        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                            <h2 className="text-lg font-semibold text-nearby-dark mb-6">Información del Workspace</h2>
                            
                            <form action={workspaceAction} className="space-y-6">
                                {workspaceState?.message && (
                                    <div className={`p-4 rounded-md ${workspaceState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                        {workspaceState.message}
                                    </div>
                                )}

                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-dark-slate mb-2">
                                        Logo de la Empresa
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {logoPreview && (
                                            <div className="w-24 h-24 border-2 border-graphite-gray rounded-lg overflow-hidden">
                                                <img 
                                                    src={logoPreview} 
                                                    alt="Logo" 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center px-4 py-2 border border-graphite-gray rounded-md shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors"
                                            >
                                                <Upload size={16} className="mr-2" />
                                                Subir Logo
                                            </button>
                                            <p className="mt-1 text-xs text-gray-500">
                                                PNG, JPG o SVG. Máximo 2MB.
                                            </p>
                                        </div>
                                    </div>
                                    <input type="hidden" name="logoUrl" id="logoUrl" defaultValue={workspace.logoUrl || ''} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-2">
                                            Nombre del Workspace
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            defaultValue={workspace.name}
                                            required
                                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                        />
                                        {workspaceState?.errors?.name && (
                                            <p className="mt-1 text-sm text-error-red">{workspaceState.errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="legalName" className="block text-sm font-medium text-dark-slate mb-2">
                                            Nombre o Razón Social
                                        </label>
                                        <input
                                            type="text"
                                            name="legalName"
                                            id="legalName"
                                            defaultValue={workspace.legalName || ''}
                                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="rnc" className="block text-sm font-medium text-dark-slate mb-2">
                                            RNC
                                        </label>
                                        <input
                                            type="text"
                                            name="rnc"
                                            id="rnc"
                                            defaultValue={workspace.rnc || ''}
                                            placeholder="000-0000000-0"
                                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-dark-slate mb-2">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            id="phone"
                                            defaultValue={workspace.phone || ''}
                                            placeholder="+1 (809) 000-0000"
                                            className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="address" className="block text-sm font-medium text-dark-slate mb-2">
                                        Dirección
                                    </label>
                                    <textarea
                                        name="address"
                                        id="address"
                                        rows={3}
                                        defaultValue={workspace.address || ''}
                                        placeholder="Calle, Número, Sector, Ciudad, País"
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-dark-slate mb-2">
                                        Plan
                                    </label>
                                    <div className="px-3 py-2 bg-gray-50 border border-graphite-gray rounded-md text-sm text-dark-slate">
                                        {workspace.subscription?.plan || "FREE"}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                                    >
                                        <Save size={16} className="mr-2" />
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'contract' && (
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
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6">
                        {/* Team Management */}
                        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-nearby-dark">Equipo</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {totalMembers} de 5 miembros (Plan FREE)
                                    </p>
                                </div>
                                {canAddMembers && (
                                    <button
                                        onClick={() => setShowInviteForm(!showInviteForm)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                                    >
                                        <UserPlus size={16} className="mr-2" />
                                        Invitar Miembro
                                    </button>
                                )}
                            </div>

                            {/* Invite Form */}
                            {showInviteForm && (
                                <form action={invitationAction} className="mb-6 p-4 bg-gray-50 rounded-lg border border-graphite-gray">
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-sm font-medium text-dark-slate">Nueva Invitación</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteForm(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {invitationState?.message && (
                                        <div className={`p-3 rounded-md mb-4 text-sm ${invitationState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                            {invitationState.message}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                placeholder="miembro@email.com"
                                                required
                                                className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                            {invitationState?.errors?.email && (
                                                <p className="mt-1 text-sm text-error-red">{invitationState.errors.email}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="role" className="block text-sm font-medium text-dark-slate mb-2">
                                                Rol
                                            </label>
                                            <select
                                                name="role"
                                                id="role"
                                                defaultValue="MEMBER"
                                                className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            >
                                                <option value="MEMBER">Miembro</option>
                                                <option value="ADMIN">Administrador</option>
                                                <option value="VIEWER">Solo lectura</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-accent hover:bg-nearby-dark transition-colors"
                                        >
                                            <Mail size={16} className="mr-2" />
                                            Enviar Invitación
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Members List */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-700">Miembros Activos</h3>
                                
                                {/* Owner */}
                                <div className="flex items-center justify-between p-4 border border-graphite-gray rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        {workspace.owner.photoUrl ? (
                                            <img
                                                src={workspace.owner.photoUrl}
                                                alt={workspace.owner.name || ""}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-dark flex items-center justify-center text-white font-semibold">
                                                {getInitials(workspace.owner.name, workspace.owner.email)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-dark-slate">
                                                {workspace.owner.name || workspace.owner.email}
                                            </p>
                                            <p className="text-xs text-gray-500">{workspace.owner.email}</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                        Owner
                                    </span>
                                </div>

                                {/* Members */}
                                {workspace.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 border border-graphite-gray rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            {member.user.photoUrl ? (
                                                <img
                                                    src={member.user.photoUrl}
                                                    alt={member.user.name || ""}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-dark flex items-center justify-center text-white font-semibold">
                                                    {getInitials(member.user.name, member.user.email)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-dark-slate">
                                                    {member.user.name || member.user.email}
                                                </p>
                                                <p className="text-xs text-gray-500">{member.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                                                member.role === 'MEMBER' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {member.role}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                disabled={removingId === member.id}
                                                className="text-error-red hover:text-red-700 disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Invitations */}
                            {workspace.invitations.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h3 className="text-sm font-medium text-gray-700">Invitaciones Pendientes</h3>
                                    {workspace.invitations.map((invitation) => (
                                        <div key={invitation.id} className="flex items-center justify-between p-4 border border-dashed border-graphite-gray rounded-lg bg-gray-50">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-dark-slate">{invitation.email}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Invitado por {invitation.inviter.name || invitation.inviter.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-warning-amber/20 text-warning-amber">
                                                    Pendiente
                                                </span>
                                                <button
                                                    onClick={() => handleRevokeInvitation(invitation.id)}
                                                    disabled={revokingId === invitation.id}
                                                    className="text-error-red hover:text-red-700 disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
