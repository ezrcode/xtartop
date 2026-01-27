"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { createCompanyAction, updateCompanyAction, deleteCompany, CompanyState } from "@/actions/companies";
import { Company, Contact, CompanyStatus, ClientInvitation, Project, ClientUser } from "@prisma/client";
import { CompanyActivitiesWithSuspense } from "../activities/company-activities-with-suspense";
import { ProjectsTable } from "./projects-table";
import { ClientUsersTable } from "./client-users-table";
import { CompanyContactsTab } from "./company-contacts-tab";
import { ImageUpload } from "../ui/image-upload";
import { PdfUpload } from "../ui/pdf-upload";
import { InvoicesTab } from "./invoices-tab";

type CompanyWithTerms = Company & { 
    primaryContact?: Contact | null;
    clientInvitations?: (ClientInvitation & { contact: Contact })[];
    projects?: Project[];
    clientUsers?: ClientUser[];
    admCloudRelationshipId?: string | null;
    admCloudLastSync?: Date | null;
    quoteId?: string | null;
    quoteFileUrl?: string | null;
};

interface CompanyFormProps {
    company?: CompanyWithTerms;
    contacts: Contact[];
    isEditMode?: boolean;
}

function SubmitButton({ actionName, label, mobileLabel, loadingLabel, icon: Icon, variant = "primary" }: {
    actionName: string;
    label: string;
    mobileLabel?: string;
    loadingLabel?: string;
    icon?: React.ElementType;
    variant?: "primary" | "secondary" | "danger";
}) {
    const { pending } = useFormStatus();

    const baseClasses = "inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95";
    const variants = {
        primary: "text-white bg-nearby-dark hover:bg-gray-900 focus:ring-nearby-dark shadow-sm",
        secondary: "text-dark-slate bg-white border border-graphite-gray hover:bg-gray-50 focus:ring-nearby-accent",
        danger: "text-white bg-error-red hover:bg-red-700 focus:ring-error-red shadow-sm",
    };

    return (
        <button
            type="submit"
            name="action"
            value={actionName}
            disabled={pending}
            className={`${baseClasses} ${variants[variant]}`}
        >
            {pending ? (
                <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline ml-2">{loadingLabel || "Guardando..."}</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={16} />}
                    <span className="hidden sm:inline ml-2">{label}</span>
                    {mobileLabel && <span className="sm:hidden ml-1.5 text-xs">{mobileLabel}</span>}
                </>
            )}
        </button>
    );
}

function DeleteButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-white bg-error-red rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {pending ? (
                <span className="flex items-center justify-center">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Eliminando...
                </span>
            ) : "Eliminar"}
        </button>
    );
}

export function CompanyForm({ company, contacts, isEditMode = false }: CompanyFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "contacts" | "subscription" | "invoices">("general");
    const [logoUrl, setLogoUrl] = useState<string | null>(company?.logoUrl || null);
    const [quoteFileUrl, setQuoteFileUrl] = useState<string | null>(company?.quoteFileUrl || null);

    const updateAction = company ? updateCompanyAction.bind(null, company.id) : () => Promise.resolve({ message: "Error" });

    const initialState: CompanyState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createCompanyAction, initialState);

    return (
        <div className="flex flex-col h-full">
            <form action={action} className="flex flex-col h-full">
                {/* Command Bar - Mobile Optimized */}
                <div className="sticky top-0 z-10 bg-white border-b border-graphite-gray shadow-sm safe-top">
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14 sm:h-16">
                            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                                <Link
                                    href="/app/companies"
                                    className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100 flex-shrink-0"
                                >
                                    <ArrowLeft size={20} />
                                </Link>
                                <h1 className="text-base sm:text-xl font-bold text-nearby-dark truncate">
                                    {isEditMode ? company?.name : "Nueva Empresa"}
                                </h1>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <SubmitButton
                                    actionName="save"
                                    label="Guardar"
                                    mobileLabel=""
                                    loadingLabel="Guardando..."
                                    icon={Save}
                                    variant="primary"
                                />
                                <SubmitButton
                                    actionName="saveAndClose"
                                    label="Guardar y cerrar"
                                    mobileLabel="Cerrar"
                                    loadingLabel="Guardando..."
                                    icon={Save}
                                    variant="secondary"
                                />

                                {isEditMode && (
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirmOpen(true)}
                                        className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-2 text-sm font-medium text-white bg-error-red rounded-lg hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                        <span className="hidden sm:inline ml-2">Eliminar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">

                        {/* Left Column: Form */}
                        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                            {/* Tabs - Mobile Optimized */}
                            <div className="border-b border-graphite-gray overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                                <nav className="-mb-px flex space-x-1 sm:space-x-6 min-w-max">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("general")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "general"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        Información General
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("contacts")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "contacts"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        Contactos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("subscription")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "subscription"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        Suscripción
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("invoices")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "invoices"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        Facturación
                                    </button>
                                </nav>
                            </div>

                            <div className="bg-white shadow-sm rounded-xl border border-graphite-gray p-4 sm:p-6 space-y-4 sm:space-y-6">
                                
                                {state?.message && (
                                    <div className={`p-4 rounded-md ${
                                        state.message.toLowerCase().includes("éxito") || state.message.toLowerCase().includes("success") || state.message.toLowerCase().includes("creado") || state.message.toLowerCase().includes("actualizado")
                                            ? "bg-green-50 text-green-800" 
                                            : "bg-red-50 text-red-800"
                                    }`}>
                                        {state.message}
                                    </div>
                                )}

                                {/* Tab Content: General Info */}
                                {activeTab === "general" && (
                                    <div className="space-y-5">
                                        {/* Logo Upload */}
                                        <ImageUpload
                                            currentImage={company?.logoUrl}
                                            onImageChange={(url) => setLogoUrl(url)}
                                            category="logo"
                                            folder="logos"
                                            size="lg"
                                            shape="square"
                                            label="Logo de la empresa"
                                        />
                                        <input type="hidden" name="logoUrl" value={logoUrl || ""} />

                                        <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-6">
                                                <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Nombre o Razón Social <span className="text-error-red">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    defaultValue={company?.name}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.name && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.name}</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="taxId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    RNC / Tax ID
                                                </label>
                                                <input
                                                    type="text"
                                                    name="taxId"
                                                    id="taxId"
                                                    defaultValue={company?.taxId || ""}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="phone" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Teléfono
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    id="phone"
                                                    defaultValue={company?.phone || ""}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="country" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    País
                                                </label>
                                                <input
                                                    type="text"
                                                    name="country"
                                                    id="country"
                                                    defaultValue={company?.country || ""}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="city" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Ciudad
                                                </label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    id="city"
                                                    defaultValue={company?.city || ""}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                            </div>

                                            <div className="sm:col-span-6">
                                                <label htmlFor="website" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Sitio Web
                                                </label>
                                                <input
                                                    type="url"
                                                    name="website"
                                                    id="website"
                                                    defaultValue={company?.website || ""}
                                                    placeholder="https://example.com"
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.website && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.website}</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="instagramUrl" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Instagram (URL)
                                                </label>
                                                <input
                                                    type="url"
                                                    name="instagramUrl"
                                                    id="instagramUrl"
                                                    defaultValue={company?.instagramUrl || ""}
                                                    placeholder="https://instagram.com/..."
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.instagramUrl && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.instagramUrl}</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    LinkedIn (URL)
                                                </label>
                                                <input
                                                    type="url"
                                                    name="linkedinUrl"
                                                    id="linkedinUrl"
                                                    defaultValue={company?.linkedinUrl || ""}
                                                    placeholder="https://linkedin.com/company/..."
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.linkedinUrl && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.linkedinUrl}</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-6">
                                                <label htmlFor="primaryContactId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Contacto Principal
                                                </label>
                                                <select
                                                    id="primaryContactId"
                                                    name="primaryContactId"
                                                    defaultValue={company?.primaryContactId || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Sin contacto principal</option>
                                                    {contacts.map((contact) => (
                                                        <option key={contact.id} value={contact.id}>
                                                            {contact.fullName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-6">
                                                <label htmlFor="origin" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Origen
                                                </label>
                                                <select
                                                    id="origin"
                                                    name="origin"
                                                    defaultValue={company?.origin || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Seleccionar origen</option>
                                                    <option value="PROSPECCION_MANUAL">Prospección manual</option>
                                                    <option value="REFERIDO_CLIENTE">Referido por cliente</option>
                                                    <option value="REFERIDO_ALIADO">Referido por aliado</option>
                                                    <option value="INBOUND_MARKETING">Inbound marketing</option>
                                                    <option value="OUTBOUND_MARKETING">Outbound marketing</option>
                                                    <option value="EVENTO_PRESENCIAL">Evento presencial</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="border-t border-graphite-gray pt-5">
                                            <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-4">Estado y Metadatos</h3>
                                            <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                                <div className="sm:col-span-3">
                                                    <label htmlFor="status" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                        Estado
                                                    </label>
                                                    <select
                                                        id="status"
                                                        name="status"
                                                        defaultValue={company?.status || "PROSPECTO"}
                                                        className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                    >
                                                        {Object.values(CompanyStatus).map((status) => (
                                                            <option key={status} value={status}>
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {isEditMode && (
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                                                            Creado el
                                                        </label>
                                                        <div className="py-3 sm:py-2.5 text-base sm:text-sm text-dark-slate">
                                                            {company?.createdAt ? new Date(company.createdAt).toLocaleDateString('es-ES', { 
                                                                year: 'numeric', 
                                                                month: '2-digit', 
                                                                day: '2-digit' 
                                                            }) : "-"}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab Content: Contacts */}
                                {activeTab === "contacts" && company && (
                                    <CompanyContactsTab 
                                        companyId={company.id} 
                                        contacts={contacts.filter(c => c.companyId === company.id)} 
                                    />
                                )}

                                {/* Tab Content: Subscription - Contract Data + Projects */}
                                {activeTab === "subscription" && company && (
                                    <div className="space-y-6">
                                        {/* Company Data for Contract */}
                                        <div>
                                            <h3 className="text-md font-semibold text-nearby-dark mb-3">
                                                Datos para el Contrato
                                            </h3>
                                            <p className="text-sm text-dark-slate mb-4">
                                                Estos datos son completados por el cliente a través del portal de onboarding.
                                            </p>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                                        Razón Social
                                                    </label>
                                                    <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                                                        {company.legalName || <span className="text-gray-400 italic">Pendiente</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                                        RNC
                                                    </label>
                                                    <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                                                        {company.taxId || <span className="text-gray-400 italic">Pendiente</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                                        Dirección Fiscal
                                                    </label>
                                                    <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                                                        {company.fiscalAddress || <span className="text-gray-400 italic">Pendiente</span>}
                                                    </div>
                                                </div>
                                                
                                                {/* Cotización - Editables solo por admin antes de aceptar contrato */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="quoteId" className="block text-sm font-medium text-dark-slate mb-1">
                                                            Id. Cotización
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="quoteId"
                                                            id="quoteId"
                                                            placeholder="Ej: COT-001"
                                                            defaultValue={company.quoteId || ""}
                                                            disabled={company.termsAccepted}
                                                            className="block w-full px-3 py-2 text-sm border border-graphite-gray rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        />
                                                        {company.termsAccepted && (
                                                            <p className="text-xs text-gray-500 mt-1">No editable después de aceptar contrato</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <PdfUpload
                                                            currentFile={company.quoteFileUrl}
                                                            onFileChange={(url) => setQuoteFileUrl(url)}
                                                            category="quote"
                                                            folder="quotes"
                                                            label="Cotización (PDF)"
                                                            disabled={company.termsAccepted}
                                                        />
                                                        <input type="hidden" name="quoteFileUrl" value={quoteFileUrl || ""} />
                                                        {company.termsAccepted && (
                                                            <p className="text-xs text-gray-500 mt-1">No editable después de aceptar contrato</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Proyectos y Usuarios Iniciales - Editables antes de enviar invitación */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="initialProjects" className="block text-sm font-medium text-dark-slate mb-1">
                                                            Proyectos iniciales
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="initialProjects"
                                                            id="initialProjects"
                                                            min={0}
                                                            defaultValue={company.initialProjects || 0}
                                                            disabled={company.termsAccepted}
                                                            className="block w-full px-3 py-2 text-sm border border-graphite-gray rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        />
                                                        {company.termsAccepted && (
                                                            <p className="text-xs text-gray-500 mt-1">No editable después de aceptar contrato</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label htmlFor="initialUsers" className="block text-sm font-medium text-dark-slate mb-1">
                                                            Usuarios iniciales
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="initialUsers"
                                                            id="initialUsers"
                                                            min={0}
                                                            defaultValue={company.initialUsers || 0}
                                                            disabled={company.termsAccepted}
                                                            className="block w-full px-3 py-2 text-sm border border-graphite-gray rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        />
                                                        {company.termsAccepted && (
                                                            <p className="text-xs text-gray-500 mt-1">No editable después de aceptar contrato</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Projects Table */}
                                        <div className="border-t border-graphite-gray pt-6">
                                            <ProjectsTable 
                                                companyId={company.id} 
                                                projects={company.projects || []} 
                                            />
                                        </div>

                                        {/* Client Users Table */}
                                        <div className="border-t border-graphite-gray pt-6">
                                            <ClientUsersTable 
                                                companyId={company.id} 
                                                clientUsers={company.clientUsers || []} 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Tab Content: Invoices */}
                                {activeTab === "invoices" && company && (
                                    <InvoicesTab
                                        companyId={company.id}
                                        companyName={company.name}
                                        taxId={company.taxId}
                                        admCloudRelationshipId={company.admCloudRelationshipId || null}
                                        admCloudLastSync={company.admCloudLastSync || null}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Right Column: Activities */}
                        <div className="lg:col-span-5 flex flex-col">
                            <div className="bg-white shadow-sm rounded-xl border border-graphite-gray p-4 sm:p-6 flex-1 flex flex-col min-h-[300px] sm:min-h-[400px] max-h-[500px] lg:max-h-[calc(100vh-200px)]">
                                {isEditMode && company ? (
                                    <CompanyActivitiesWithSuspense
                                        companyId={company.id}
                                        defaultEmail={company.primaryContact?.email || ""}
                                        clientInvitations={company.clientInvitations?.map(inv => ({
                                            id: inv.id,
                                            contactId: inv.contactId,
                                            status: inv.status,
                                            createdAt: inv.createdAt,
                                            expiresAt: inv.expiresAt,
                                            contact: {
                                                fullName: inv.contact.fullName,
                                                email: inv.contact.email,
                                            },
                                        })) || []}
                                        contractStatus={{
                                            termsAccepted: company.termsAccepted,
                                            termsAcceptedAt: company.termsAcceptedAt,
                                            termsAcceptedByName: company.termsAcceptedByName,
                                            termsVersion: company.termsVersion,
                                        }}
                                        companyContacts={contacts.filter(c => c.companyId === company.id)}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-gray-500">
                                            Guarda la empresa primero para registrar actividades
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && company && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg p-5 sm:p-6 w-full sm:max-w-md safe-bottom">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Empresa</h3>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base">
                            ¿Estás seguro de que deseas eliminar <strong>{company.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <form action={deleteCompany.bind(null, company.id)} className="w-full sm:w-auto">
                                <DeleteButton />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
