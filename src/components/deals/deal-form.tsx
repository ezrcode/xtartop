"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { createDealAction, updateDealAction, deleteDeal, DealState, createCompanyFromDeal, createContactFromDeal } from "@/actions/deals";
import { Deal, Company, Contact, User, BusinessLine } from "@prisma/client";
import { ActivitiesWithSuspense } from "../activities/activities-with-suspense";
import { QuotesTable } from "../quotes/quotes-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface DealFormProps {
    deal?: (Deal & {
        description?: string | null;
        recurrence?: "ONETIME_PROJECT" | "SUSCRIPCION" | null;
    }) & {
        company?: Company | null; 
        contact?: Contact | null;
        createdBy?: Pick<User, 'id' | 'name' | 'email'> | null;
        businessLine?: BusinessLine | null;
    };
    companies: Company[];
    contacts: Contact[];
    businessLines?: BusinessLine[];
    isEditMode?: boolean;
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
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

    const baseClasses = "inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95";
    const variants = {
        primary: "text-white bg-nearby-dark hover:bg-nearby-dark-600 focus:ring-nearby-dark shadow-sm",
        secondary: "text-[var(--foreground)] bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--surface-2)] focus:ring-nearby-accent",
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

export function DealForm({ deal, companies, contacts, businessLines = [], isEditMode = false, workspace }: DealFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "quotes">("general");
    const [companiesState, setCompaniesState] = useState<Company[]>(companies);
    const [contactsState, setContactsState] = useState<Contact[]>(contacts);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(deal?.companyId || "null");
    const [selectedContactId, setSelectedContactId] = useState<string>(deal?.contactId || "null");
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState("");
    const [newContactName, setNewContactName] = useState("");
    const [newContactEmail, setNewContactEmail] = useState("");
    const [createCompanyError, setCreateCompanyError] = useState("");
    const [createContactError, setCreateContactError] = useState("");
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [isCreatingContact, setIsCreatingContact] = useState(false);

    const updateAction = deal ? updateDealAction.bind(null, deal.id) : () => Promise.resolve({ message: "Error" });

    const initialState: DealState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createDealAction, initialState);

    const filteredContacts = useMemo(() => {
        if (selectedCompanyId === "null") return contactsState;
        return contactsState.filter((contact) => contact.companyId === selectedCompanyId);
    }, [contactsState, selectedCompanyId]);

    useEffect(() => {
        if (selectedContactId === "null") return;
        const selectedContact = contactsState.find((contact) => contact.id === selectedContactId);
        if (!selectedContact) {
            setSelectedContactId("null");
            return;
        }
        if (selectedCompanyId !== "null" && selectedContact.companyId !== selectedCompanyId) {
            setSelectedContactId("null");
        }
    }, [selectedCompanyId, selectedContactId, contactsState]);

    const handleCreateCompany = async () => {
        setCreateCompanyError("");
        setIsCreatingCompany(true);
        const result = await createCompanyFromDeal(newCompanyName);
        setIsCreatingCompany(false);

        if (!result.success || !result.company) {
            setCreateCompanyError(result.message || "No se pudo crear la empresa.");
            return;
        }

        setCompaniesState((prev) => [...prev, result.company].sort((a, b) => a.name.localeCompare(b.name, "es")));
        setSelectedCompanyId(result.company.id);
        setSelectedContactId("null");
        setNewCompanyName("");
        setIsCreateCompanyOpen(false);
    };

    const handleCreateContact = async () => {
        setCreateContactError("");
        setIsCreatingContact(true);
        const result = await createContactFromDeal({
            fullName: newContactName,
            email: newContactEmail,
            companyId: selectedCompanyId === "null" ? null : selectedCompanyId,
        });
        setIsCreatingContact(false);

        if (!result.success || !result.contact) {
            setCreateContactError(result.message || "No se pudo crear el contacto.");
            return;
        }

        setContactsState((prev) => [...prev, result.contact].sort((a, b) => a.fullName.localeCompare(b.fullName, "es")));
        setSelectedContactId(result.contact.id);
        setNewContactName("");
        setNewContactEmail("");
        setIsCreateContactOpen(false);
    };

    return (
        <div className="flex flex-col h-full">
            <form action={action} className="flex flex-col h-full">
                {/* Command Bar - Mobile Optimized */}
                <div className="sticky top-16 z-30 bg-[var(--card-bg)] border-b border-[var(--card-border)] shadow-sm">
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14 sm:h-16">
                            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                                <Link
                                    href="/app/deals"
                                    className="p-2 text-[var(--muted-text)] hover:text-[var(--foreground)] rounded-full hover:bg-[var(--hover-bg)] flex-shrink-0"
                                >
                                    <ArrowLeft size={20} />
                                </Link>
                                <h1 className="text-base sm:text-xl font-bold text-[var(--foreground)] truncate">
                                    {isEditMode ? deal?.name : "Nuevo Negocio"}
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
                            <div className="border-b border-[var(--card-border)] overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                                <nav className="-mb-px flex space-x-1 sm:space-x-6 min-w-max">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("general")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "general"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-[var(--muted-text)] hover:text-[var(--foreground)] hover:border-[var(--card-border)]"
                                        }`}
                                    >
                                        Información General
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("quotes")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "quotes"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-[var(--muted-text)] hover:text-[var(--foreground)] hover:border-[var(--card-border)]"
                                        }`}
                                    >
                                        Cotizaciones
                                    </button>
                                </nav>
                            </div>

                            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-4 sm:p-6 space-y-4 sm:space-y-6">
                                
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
                                        <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                            {/* Nombre del Negocio */}
                                            <div className="sm:col-span-6">
                                                <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Nombre del Negocio <span className="text-error-red">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    defaultValue={deal?.name}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.name && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.name}</p>
                                                )}
                                            </div>

                                            {/* Descripción */}
                                            <div className="sm:col-span-6">
                                                <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Descripción
                                                </label>
                                                <textarea
                                                    name="description"
                                                    id="description"
                                                    rows={5}
                                                    defaultValue={deal?.description || ""}
                                                    placeholder="Describe brevemente el contexto, alcance y objetivos del negocio..."
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-y"
                                                />
                                                {state?.errors?.description && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.description}</p>
                                                )}
                                            </div>

                                            {/* Empresa y Contacto */}
                                            <div className="sm:col-span-3">
                                                <label htmlFor="companyId" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Empresa
                                                </label>
                                                <select
                                                    id="companyId"
                                                    name="companyId"
                                                    value={selectedCompanyId}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === "__create_company__") {
                                                            setCreateCompanyError("");
                                                            setIsCreateCompanyOpen(true);
                                                            return;
                                                        }
                                                        setSelectedCompanyId(value);
                                                    }}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="__create_company__">✨ + Crear nueva empresa</option>
                                                    <option value="null">Sin empresa</option>
                                                    {companiesState.map((company) => (
                                                        <option key={company.id} value={company.id}>
                                                            {company.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="contactId" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Contacto
                                                </label>
                                                <select
                                                    id="contactId"
                                                    name="contactId"
                                                    value={selectedContactId}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === "__create_contact__") {
                                                            setCreateContactError("");
                                                            setIsCreateContactOpen(true);
                                                            return;
                                                        }
                                                        setSelectedContactId(value);
                                                    }}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="__create_contact__">✨ + Crear nuevo contacto</option>
                                                    <option value="null">Sin contacto</option>
                                                    {filteredContacts.map((contact) => (
                                                        <option key={contact.id} value={contact.id}>
                                                            {contact.fullName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Recurrencia, tipo y estado */}
                                            <div className="sm:col-span-2">
                                                <label htmlFor="recurrence" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Recurrencia <span className="text-error-red">*</span>
                                                </label>
                                                <select
                                                    id="recurrence"
                                                    name="recurrence"
                                                    defaultValue={deal?.recurrence || "ONETIME_PROJECT"}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="ONETIME_PROJECT">Onetime Project</option>
                                                    <option value="SUSCRIPCION">Suscripción</option>
                                                </select>
                                                {state?.errors?.recurrence && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.recurrence}</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="type" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Tipo de Negocio
                                                </label>
                                                <select
                                                    id="type"
                                                    name="type"
                                                    defaultValue={deal?.type || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="null">Seleccionar tipo</option>
                                                    <option value="CLIENTE_NUEVO">Cliente nuevo</option>
                                                    <option value="UPSELLING">Upselling</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="status" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Estado <span className="text-error-red">*</span>
                                                </label>
                                                <select
                                                    id="status"
                                                    name="status"
                                                    defaultValue={deal?.status || "PROSPECCION"}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="PROSPECCION">Prospección</option>
                                                    <option value="CALIFICACION">Calificación</option>
                                                    <option value="NEGOCIACION">Negociación</option>
                                                    <option value="FORMALIZACION">Formalización</option>
                                                    <option value="CIERRE_GANADO">Cierre ganado</option>
                                                    <option value="CIERRE_PERDIDO">Cierre perdido</option>
                                                    <option value="NO_CALIFICADOS">No calificados</option>
                                                </select>
                                            </div>

                                            {/* Valor y LoB */}
                                            <div className="sm:col-span-3">
                                                <label htmlFor="value" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    Valor del Negocio
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-[var(--muted-text)] text-base sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        name="value"
                                                        id="value"
                                                        step="0.01"
                                                        defaultValue={deal?.value ? deal.value.toString() : "0"}
                                                        className="block w-full pl-7 pr-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="businessLineId" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                                    LoB
                                                </label>
                                                <select
                                                    id="businessLineId"
                                                    name="businessLineId"
                                                    defaultValue={deal?.businessLineId || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-[var(--card-bg)]"
                                                >
                                                    <option value="null">Sin línea</option>
                                                    {businessLines.map((bl) => (
                                                        <option key={bl.id} value={bl.id}>
                                                            {bl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {isEditMode && deal && (
                                            <div className="border-t border-[var(--card-border)] pt-5">
                                                <h3 className="text-base sm:text-lg font-medium text-[var(--foreground)] mb-4">Metadatos</h3>
                                                <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">
                                                            Creado por
                                                        </label>
                                                        <div className="py-3 sm:py-2.5 text-base sm:text-sm text-[var(--foreground)]">
                                                            {deal.createdBy?.name || deal.createdBy?.email || "-"}
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label className="block text-sm font-medium text-[var(--muted-text)] mb-1.5">
                                                            Fecha de creación
                                                        </label>
                                                        <div className="py-3 sm:py-2.5 text-base sm:text-sm text-[var(--foreground)]">
                                                            {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString('es-ES', { 
                                                                year: 'numeric', 
                                                                month: '2-digit', 
                                                                day: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : "-"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab Content: Quotes */}
                                {activeTab === "quotes" && isEditMode && deal && (
                                    <QuotesTable 
                                        dealId={deal.id}
                                        companyName={deal.company?.name}
                                        contactName={deal.contact?.fullName}
                                        workspace={workspace}
                                    />
                                )}
                                {activeTab === "quotes" && !isEditMode && (
                                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-[var(--card-border)] rounded-lg bg-[var(--surface-2)]">
                                        <p className="text-[var(--muted-text)]">
                                            Guarda el negocio primero para poder crear cotizaciones
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Activities */}
                        <div className="lg:col-span-5">
                            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-4 sm:p-6 h-full min-h-[300px] sm:min-h-[400px] max-h-[500px] lg:max-h-[calc(100vh-200px)]">
                                {isEditMode && deal ? (
                                    <ActivitiesWithSuspense
                                        entityType="deal"
                                        entityId={deal.id}
                                        defaultEmail={deal.contact?.email || ""}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center border-2 border-dashed border-[var(--card-border)] rounded-lg bg-[var(--surface-2)]">
                                        <p className="text-[var(--muted-text)] text-sm px-4">
                                            Guarda el negocio primero para registrar actividades
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </form>

            <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Nueva Empresa</DialogTitle>
                        <DialogDescription>Crea una empresa sin salir del negocio.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Nombre</label>
                            <input
                                type="text"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                placeholder="Nombre de la empresa"
                                className="block w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                            />
                        </div>
                        {createCompanyError && <p className="text-xs text-error-red">{createCompanyError}</p>}
                    </div>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setIsCreateCompanyOpen(false)}
                            className="px-4 py-2.5 text-sm font-medium border border-[var(--card-border)] rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isCreatingCompany}
                            onClick={handleCreateCompany}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-lg disabled:opacity-50"
                        >
                            {isCreatingCompany ? "Guardando..." : "Guardar"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateContactOpen} onOpenChange={setIsCreateContactOpen}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Nuevo Contacto</DialogTitle>
                        <DialogDescription>
                            {selectedCompanyId === "null"
                                ? "Se creará sin empresa asociada."
                                : "Se asociará automáticamente a la empresa seleccionada."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Nombre completo</label>
                            <input
                                type="text"
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                                placeholder="Nombre del contacto"
                                className="block w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Correo</label>
                            <input
                                type="email"
                                value={newContactEmail}
                                onChange={(e) => setNewContactEmail(e.target.value)}
                                placeholder="correo@empresa.com"
                                className="block w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                            />
                        </div>
                        {createContactError && <p className="text-xs text-error-red">{createContactError}</p>}
                    </div>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setIsCreateContactOpen(false)}
                            className="px-4 py-2.5 text-sm font-medium border border-[var(--card-border)] rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isCreatingContact}
                            onClick={handleCreateContact}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-lg disabled:opacity-50"
                        >
                            {isCreatingContact ? "Guardando..." : "Guardar"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && deal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-[var(--card-bg)] rounded-t-lg sm:rounded-lg shadow-lg p-5 sm:p-6 w-full sm:max-w-md safe-bottom">
                        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Eliminar Negocio</h3>
                        <p className="text-[var(--muted-text)] mb-6 text-sm sm:text-base">
                            ¿Estás seguro de que deseas eliminar <strong>{deal.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <form action={deleteDeal.bind(null, deal.id)} className="w-full sm:w-auto">
                                <DeleteButton />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
