"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft } from "lucide-react";
import { createDealAction, updateDealAction, deleteDeal, DealState } from "@/actions/deals";
import { Deal, Company, Contact, DealStatus, DealType, User } from "@prisma/client";
import { ActivitiesWithSuspense } from "../activities/activities-with-suspense";
import { QuotesTable } from "../quotes/quotes-table";

interface DealFormProps {
    deal?: Deal & { 
        company?: Company | null; 
        contact?: Contact | null;
        createdBy?: Pick<User, 'id' | 'name' | 'email'> | null;
    };
    companies: Company[];
    contacts: Contact[];
    isEditMode?: boolean;
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
}

export function DealForm({ deal, companies, contacts, isEditMode = false, workspace }: DealFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [actionType, setActionType] = useState<string>("save");
    const [activeTab, setActiveTab] = useState<"general" | "quotes">("general");

    const updateAction = deal ? updateDealAction.bind(null, deal.id) : () => Promise.resolve({ message: "Error" });

    const initialState: DealState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createDealAction, initialState);

    const handleSubmit = (actionValue: string) => {
        setActionType(actionValue);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Command Bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-graphite-gray shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/app/deals"
                                className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-xl font-bold text-xtartop-black">
                                {isEditMode ? deal?.name : "Nuevo Negocio"}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                type="submit"
                                form="deal-form"
                                onClick={() => handleSubmit("save")}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-xtartop-black rounded-md hover:bg-gray-900 transition-colors"
                            >
                                <Save size={16} className="mr-2" />
                                Guardar
                            </button>
                            <button
                                type="submit"
                                form="deal-form"
                                onClick={() => handleSubmit("saveAndClose")}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50 transition-colors"
                            >
                                <Save size={16} className="mr-2" />
                                Guardar y cerrar
                            </button>

                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmOpen(true)}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700 transition-colors"
                                >
                                    <Trash2 size={16} className="mr-2" />
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Tabs */}
                        <div className="border-b border-graphite-gray">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("general")}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === "general"
                                            ? "border-founder-blue text-founder-blue"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Información General
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("quotes")}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === "quotes"
                                            ? "border-founder-blue text-founder-blue"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Cotizaciones
                                </button>
                            </nav>
                        </div>

                        <form
                            id="deal-form"
                            action={action}
                            className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 space-y-6"
                        >
                            <input type="hidden" name="action" value={actionType} />
                            
                            {state?.message && (
                                <div className={`p-4 rounded-md ${state.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                                    {state.message}
                                </div>
                            )}

                            {/* Tab Content: General Info */}
                            {activeTab === "general" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                        <div className="sm:col-span-6">
                                            <label htmlFor="name" className="block text-sm font-medium text-dark-slate">
                                                Nombre del Negocio <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                defaultValue={deal?.name}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                            {state?.errors?.name && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.name}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="value" className="block text-sm font-medium text-dark-slate">
                                                Valor del Negocio
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="value"
                                                    id="value"
                                                    step="0.01"
                                                    defaultValue={deal?.value ? deal.value.toString() : "0"}
                                                    className="block w-full pl-7 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="mrr" className="block text-sm font-medium text-dark-slate">
                                                MRR
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="mrr"
                                                    id="mrr"
                                                    step="0.01"
                                                    defaultValue={deal?.mrr ? deal.mrr.toString() : ""}
                                                    className="block w-full pl-7 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="arr" className="block text-sm font-medium text-dark-slate">
                                                ARR
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="arr"
                                                    id="arr"
                                                    step="0.01"
                                                    defaultValue={deal?.arr ? deal.arr.toString() : ""}
                                                    className="block w-full pl-7 px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="companyId" className="block text-sm font-medium text-dark-slate">
                                                Empresa
                                            </label>
                                            <select
                                                id="companyId"
                                                name="companyId"
                                                defaultValue={deal?.companyId || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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
                                            <label htmlFor="contactId" className="block text-sm font-medium text-dark-slate">
                                                Contacto
                                            </label>
                                            <select
                                                id="contactId"
                                                name="contactId"
                                                defaultValue={deal?.contactId || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            >
                                                <option value="null">Sin contacto</option>
                                                {contacts.map((contact) => (
                                                    <option key={contact.id} value={contact.id}>
                                                        {contact.fullName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="type" className="block text-sm font-medium text-dark-slate">
                                                Tipo de Negocio
                                            </label>
                                            <select
                                                id="type"
                                                name="type"
                                                defaultValue={deal?.type || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            >
                                                <option value="null">Seleccionar tipo</option>
                                                <option value="CLIENTE_NUEVO">Cliente nuevo</option>
                                                <option value="UPSELLING">Upselling</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="status" className="block text-sm font-medium text-dark-slate">
                                                Estado <span className="text-error-red">*</span>
                                            </label>
                                            <select
                                                id="status"
                                                name="status"
                                                defaultValue={deal?.status || "PROSPECCION"}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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
                                    </div>

                                    {isEditMode && deal && (
                                        <div className="border-t border-graphite-gray pt-6">
                                            <h3 className="text-lg font-medium text-dark-slate mb-4">Metadatos</h3>
                                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                <div className="sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-500">
                                                        Creado por
                                                    </label>
                                                    <div className="mt-2 text-sm text-dark-slate">
                                                        {deal.createdBy?.name || deal.createdBy?.email || "-"}
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-500">
                                                        Fecha de creación
                                                    </label>
                                                    <div className="mt-2 text-sm text-dark-slate">
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
                        </form>
                    </div>

                    {/* Right Column: Activities */}
                    <div className="lg:col-span-5">
                        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 h-full min-h-[400px]">
                            {isEditMode && deal ? (
                                <ActivitiesWithSuspense
                                    entityType="deal"
                                    entityId={deal.id}
                                    defaultEmail={deal.contact?.email || ""}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    <p className="text-gray-500">
                                        Guarda el negocio primero para registrar actividades
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && deal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Negocio</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar <strong>{deal.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <form action={deleteDeal.bind(null, deal.id)}>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700"
                                >
                                    Eliminar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

