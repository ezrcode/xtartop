"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft } from "lucide-react";
import { createCompanyAction, updateCompanyAction, deleteCompany, CompanyState } from "@/actions/companies";
import { Company, Contact, CompanyStatus, CompanyOrigin } from "@prisma/client";

interface CompanyFormProps {
    company?: Company & { primaryContact?: Contact | null };
    contacts: Contact[];
    isEditMode?: boolean;
}

export function CompanyForm({ company, contacts, isEditMode = false }: CompanyFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [actionType, setActionType] = useState<string>("save");
    const [activeTab, setActiveTab] = useState<"general" | "subscription">("general");

    const updateAction = company ? updateCompanyAction.bind(null, company.id) : () => Promise.resolve({ message: "Error" });

    const initialState: CompanyState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createCompanyAction, initialState);

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
                                href="/app/companies"
                                className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-xl font-bold text-xtartop-black">
                                {isEditMode ? company?.name : "Nueva Empresa"}
                            </h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                type="submit"
                                form="company-form"
                                onClick={() => handleSubmit("save")}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-xtartop-black rounded-md hover:bg-gray-900 transition-colors"
                            >
                                <Save size={16} className="mr-2" />
                                Guardar
                            </button>
                            <button
                                type="submit"
                                form="company-form"
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
                                    onClick={() => setActiveTab("subscription")}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === "subscription"
                                            ? "border-founder-blue text-founder-blue"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    Suscripción
                                </button>
                            </nav>
                        </div>

                        <form
                            id="company-form"
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
                                    {/* Logo Placeholder */}
                                    <div className="flex items-center space-x-4">
                                        <div className="h-16 w-16 rounded-lg bg-soft-gray flex items-center justify-center text-gray-400 border border-graphite-gray">
                                            <span className="text-2xl font-bold">
                                                {company?.name ? company.name.charAt(0).toUpperCase() : "?"}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Logo de la empresa (Próximamente)
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                        <div className="sm:col-span-6">
                                            <label htmlFor="name" className="block text-sm font-medium text-dark-slate">
                                                Nombre o Razón Social <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                defaultValue={company?.name}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                            {state?.errors?.name && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.name}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="taxId" className="block text-sm font-medium text-dark-slate">
                                                Tax ID
                                            </label>
                                            <input
                                                type="text"
                                                name="taxId"
                                                id="taxId"
                                                defaultValue={company?.taxId || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="phone" className="block text-sm font-medium text-dark-slate">
                                                Teléfono
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                id="phone"
                                                defaultValue={company?.phone || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="country" className="block text-sm font-medium text-dark-slate">
                                                País
                                            </label>
                                            <input
                                                type="text"
                                                name="country"
                                                id="country"
                                                defaultValue={company?.country || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="city" className="block text-sm font-medium text-dark-slate">
                                                Ciudad
                                            </label>
                                            <input
                                                type="text"
                                                name="city"
                                                id="city"
                                                defaultValue={company?.city || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label htmlFor="website" className="block text-sm font-medium text-dark-slate">
                                                Sitio Web
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                id="website"
                                                defaultValue={company?.website || ""}
                                                placeholder="https://example.com"
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                            {state?.errors?.website && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.website}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="instagramUrl" className="block text-sm font-medium text-dark-slate">
                                                Instagram (URL)
                                            </label>
                                            <input
                                                type="url"
                                                name="instagramUrl"
                                                id="instagramUrl"
                                                defaultValue={company?.instagramUrl || ""}
                                                placeholder="https://instagram.com/..."
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                            {state?.errors?.instagramUrl && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.instagramUrl}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="linkedinUrl" className="block text-sm font-medium text-dark-slate">
                                                LinkedIn (URL)
                                            </label>
                                            <input
                                                type="url"
                                                name="linkedinUrl"
                                                id="linkedinUrl"
                                                defaultValue={company?.linkedinUrl || ""}
                                                placeholder="https://linkedin.com/company/..."
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                            />
                                            {state?.errors?.linkedinUrl && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.linkedinUrl}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label htmlFor="primaryContactId" className="block text-sm font-medium text-dark-slate">
                                                Contacto Principal
                                            </label>
                                            <select
                                                id="primaryContactId"
                                                name="primaryContactId"
                                                defaultValue={company?.primaryContactId || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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
                                            <label htmlFor="origin" className="block text-sm font-medium text-dark-slate">
                                                Origen
                                            </label>
                                            <select
                                                id="origin"
                                                name="origin"
                                                defaultValue={company?.origin || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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

                                    <div className="border-t border-graphite-gray pt-6">
                                        <h3 className="text-lg font-medium text-dark-slate mb-4">Estado y Metadatos</h3>
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-3">
                                                <label htmlFor="status" className="block text-sm font-medium text-dark-slate">
                                                    Estado
                                                </label>
                                                <select
                                                    id="status"
                                                    name="status"
                                                    defaultValue={company?.status || "PROSPECTO"}
                                                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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
                                                    <label className="block text-sm font-medium text-gray-500">
                                                        Creado el
                                                    </label>
                                                    <div className="mt-2 text-sm text-dark-slate">
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

                            {/* Tab Content: Subscription */}
                            {activeTab === "subscription" && (
                                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    <p className="text-gray-500">
                                        La pestaña de Suscripción <br />
                                        se implementará próximamente
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Right Column: Activities Placeholder */}
                    <div className="lg:col-span-5">
                        <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 h-full min-h-[400px]">
                            <h3 className="text-lg font-medium text-dark-slate mb-4">Actividades</h3>
                            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                <p className="text-gray-500">
                                    Aquí irá la línea de tiempo de actividades <br />
                                    (llamadas, notas, tareas, etc.)
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && company && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Empresa</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar <strong>{company.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <form action={deleteCompany.bind(null, company.id)}>
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

