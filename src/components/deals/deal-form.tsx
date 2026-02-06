"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { createDealAction, updateDealAction, deleteDeal, DealState } from "@/actions/deals";
import { Deal, Company, Contact, DealStatus, DealType, User, BusinessLine } from "@prisma/client";
import { ActivitiesWithSuspense } from "../activities/activities-with-suspense";
import { QuotesTable } from "../quotes/quotes-table";

interface DealFormProps {
    deal?: Deal & { 
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

export function DealForm({ deal, companies, contacts, businessLines = [], isEditMode = false, workspace }: DealFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "quotes">("general");

    const updateAction = deal ? updateDealAction.bind(null, deal.id) : () => Promise.resolve({ message: "Error" });

    const initialState: DealState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createDealAction, initialState);

    return (
        <div className="flex flex-col h-full">
            <form action={action} className="flex flex-col h-full">
                {/* Command Bar - Mobile Optimized */}
                <div className="sticky top-16 z-30 bg-white border-b border-graphite-gray shadow-sm">
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14 sm:h-16">
                            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                                <Link
                                    href="/app/deals"
                                    className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100 flex-shrink-0"
                                >
                                    <ArrowLeft size={20} />
                                </Link>
                                <h1 className="text-base sm:text-xl font-bold text-nearby-dark truncate">
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
                                        onClick={() => setActiveTab("quotes")}
                                        className={`py-3 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                                            activeTab === "quotes"
                                                ? "border-nearby-accent text-nearby-accent"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        Cotizaciones
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
                                        <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                            {/* Nombre del Negocio */}
                                            <div className="sm:col-span-6">
                                                <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Nombre del Negocio <span className="text-error-red">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    defaultValue={deal?.name}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                />
                                                {state?.errors?.name && (
                                                    <p className="mt-1.5 text-xs text-error-red">{state.errors.name}</p>
                                                )}
                                            </div>

                                            {/* Empresa y Contacto */}
                                            <div className="sm:col-span-3">
                                                <label htmlFor="companyId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Empresa
                                                </label>
                                                <select
                                                    id="companyId"
                                                    name="companyId"
                                                    defaultValue={deal?.companyId || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Sin empresa</option>
                                                    {companies.map((company) => (
                                                        <option key={company.id} value={company.id}>
                                                            {company.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label htmlFor="contactId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Contacto
                                                </label>
                                                <select
                                                    id="contactId"
                                                    name="contactId"
                                                    defaultValue={deal?.contactId || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Sin contacto</option>
                                                    {contacts.map((contact) => (
                                                        <option key={contact.id} value={contact.id}>
                                                            {contact.fullName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Tipo de Negocio, LoB y Estado */}
                                            <div className="sm:col-span-2">
                                                <label htmlFor="type" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Tipo de Negocio
                                                </label>
                                                <select
                                                    id="type"
                                                    name="type"
                                                    defaultValue={deal?.type || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Seleccionar tipo</option>
                                                    <option value="CLIENTE_NUEVO">Cliente nuevo</option>
                                                    <option value="UPSELLING">Upselling</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="businessLineId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    LoB
                                                </label>
                                                <select
                                                    id="businessLineId"
                                                    name="businessLineId"
                                                    defaultValue={deal?.businessLineId || "null"}
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                                >
                                                    <option value="null">Sin línea</option>
                                                    {businessLines.map((bl) => (
                                                        <option key={bl.id} value={bl.id}>
                                                            {bl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="status" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Estado <span className="text-error-red">*</span>
                                                </label>
                                                <select
                                                    id="status"
                                                    name="status"
                                                    defaultValue={deal?.status || "PROSPECCION"}
                                                    required
                                                    className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
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

                                            {/* Valor, MRR, ARR - debajo de Tipo */}
                                            <div className="sm:col-span-2">
                                                <label htmlFor="value" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    Valor del Negocio
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-base sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        name="value"
                                                        id="value"
                                                        step="0.01"
                                                        defaultValue={deal?.value ? deal.value.toString() : "0"}
                                                        className="block w-full pl-7 pr-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="mrr" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    MRR
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-base sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        name="mrr"
                                                        id="mrr"
                                                        step="0.01"
                                                        defaultValue={deal?.mrr ? deal.mrr.toString() : ""}
                                                        className="block w-full pl-7 pr-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="arr" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                    ARR
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-base sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        name="arr"
                                                        id="arr"
                                                        step="0.01"
                                                        defaultValue={deal?.arr ? deal.arr.toString() : ""}
                                                        className="block w-full pl-7 pr-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {isEditMode && deal && (
                                            <div className="border-t border-graphite-gray pt-5">
                                                <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-4">Metadatos</h3>
                                                <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                                                            Creado por
                                                        </label>
                                                        <div className="py-3 sm:py-2.5 text-base sm:text-sm text-dark-slate">
                                                            {deal.createdBy?.name || deal.createdBy?.email || "-"}
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                                                            Fecha de creación
                                                        </label>
                                                        <div className="py-3 sm:py-2.5 text-base sm:text-sm text-dark-slate">
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
                                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-gray-500">
                                            Guarda el negocio primero para poder crear cotizaciones
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Activities */}
                        <div className="lg:col-span-5">
                            <div className="bg-white shadow-sm rounded-xl border border-graphite-gray p-4 sm:p-6 h-full min-h-[300px] sm:min-h-[400px] max-h-[500px] lg:max-h-[calc(100vh-200px)]">
                                {isEditMode && deal ? (
                                    <ActivitiesWithSuspense
                                        entityType="deal"
                                        entityId={deal.id}
                                        defaultEmail={deal.contact?.email || ""}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-gray-500 text-sm px-4">
                                            Guarda el negocio primero para registrar actividades
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && deal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg p-5 sm:p-6 w-full sm:max-w-md safe-bottom">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Negocio</h3>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base">
                            ¿Estás seguro de que deseas eliminar <strong>{deal.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-lg hover:bg-gray-50 transition-colors"
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
