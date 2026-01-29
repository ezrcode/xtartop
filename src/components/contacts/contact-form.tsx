"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Save, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { createContactAction, updateContactAction, deleteContact, ContactState } from "@/actions/contacts";
import { Company, Contact, ContactStatus } from "@prisma/client";
import { ActivitiesWithSuspense } from "../activities/activities-with-suspense";

interface ContactFormProps {
    contact?: Contact;
    companies: Company[];
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

export function ContactForm({ contact, companies, isEditMode = false }: ContactFormProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const updateAction = contact ? updateContactAction.bind(null, contact.id) : () => Promise.resolve({ message: "Error" });

    const initialState: ContactState = { message: "", errors: {} };
    const [state, action] = useFormState(isEditMode ? updateAction : createContactAction, initialState);

    return (
        <div className="flex flex-col h-full">
            <form action={action} className="flex flex-col h-full">
                {/* Command Bar - Mobile Optimized */}
                <div className="sticky top-16 z-30 bg-white border-b border-graphite-gray shadow-sm">
                    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14 sm:h-16">
                            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                                <Link
                                    href="/app/contacts"
                                    className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100 flex-shrink-0"
                                >
                                    <ArrowLeft size={20} />
                                </Link>
                                <h1 className="text-base sm:text-xl font-bold text-nearby-dark truncate">
                                    {isEditMode ? contact?.fullName : "Nuevo Contacto"}
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

                        {/* Left Column: Form Fields */}
                        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                            <div className="bg-white shadow-sm rounded-xl border border-graphite-gray p-4 sm:p-6 space-y-4 sm:space-y-6">
                                
                                {state?.message && (
                                    <div className={`p-3 sm:p-4 rounded-lg text-sm ${
                                        state.message.toLowerCase().includes("éxito") || state.message.toLowerCase().includes("success") || state.message.toLowerCase().includes("creado") || state.message.toLowerCase().includes("actualizado")
                                            ? "bg-green-50 text-green-800" 
                                            : "bg-red-50 text-red-800"
                                    }`}>
                                        {state.message}
                                    </div>
                                )}

                                {/* General Info */}
                                <div>
                                    <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-4">Información General</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">

                                        {/* Photo Placeholder */}
                                        <div className="sm:col-span-6 flex items-center space-x-3 sm:space-x-4">
                                            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-soft-gray flex items-center justify-center text-gray-400 flex-shrink-0">
                                                <span className="text-xl sm:text-2xl font-bold">
                                                    {contact?.fullName ? contact.fullName.charAt(0).toUpperCase() : "?"}
                                                </span>
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-500">
                                                Foto de perfil (Próximamente)
                                            </div>
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label htmlFor="fullName" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Nombre completo <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                id="fullName"
                                                defaultValue={contact?.fullName}
                                                required
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            />
                                            {state?.errors?.fullName && (
                                                <p className="mt-1.5 text-xs text-error-red">{state.errors.fullName}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Cargo
                                            </label>
                                            <input
                                                type="text"
                                                name="title"
                                                id="title"
                                                defaultValue={contact?.title || ""}
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="companyId" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Empresa
                                            </label>
                                            <select
                                                id="companyId"
                                                name="companyId"
                                                defaultValue={contact?.companyId || "null"}
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
                                    </div>
                                </div>

                                <div className="border-t border-graphite-gray pt-5">
                                    <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-4">Contacto</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:gap-y-5 sm:gap-x-4 sm:grid-cols-6">
                                        <div className="sm:col-span-3">
                                            <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Correo electrónico <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                defaultValue={contact?.email}
                                                required
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            />
                                            {state?.errors?.email && (
                                                <p className="mt-1.5 text-xs text-error-red">{state.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="mobile" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Móvil
                                            </label>
                                            <input
                                                type="tel"
                                                name="mobile"
                                                id="mobile"
                                                defaultValue={contact?.mobile || ""}
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="instagramUrl" className="block text-sm font-medium text-dark-slate mb-1.5">
                                                Instagram (URL)
                                            </label>
                                            <input
                                                type="url"
                                                name="instagramUrl"
                                                id="instagramUrl"
                                                defaultValue={contact?.instagramUrl || ""}
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
                                                defaultValue={contact?.linkedinUrl || ""}
                                                placeholder="https://linkedin.com/in/..."
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                            />
                                            {state?.errors?.linkedinUrl && (
                                                <p className="mt-1.5 text-xs text-error-red">{state.errors.linkedinUrl}</p>
                                            )}
                                        </div>
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
                                                defaultValue={contact?.status || "PROSPECTO"}
                                                className="block w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                            >
                                                {Object.values(ContactStatus).map((status) => (
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
                                                    {contact?.createdAt ? new Date(contact.createdAt).toLocaleDateString('es-ES', { 
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
                        </div>

                        {/* Right Column: Activities */}
                        <div className="lg:col-span-5">
                            <div className="bg-white shadow-sm rounded-xl border border-graphite-gray p-4 sm:p-6 h-full min-h-[300px] sm:min-h-[400px] max-h-[500px] lg:max-h-[calc(100vh-200px)]">
                                {isEditMode && contact ? (
                                    <ActivitiesWithSuspense
                                        entityType="contact"
                                        entityId={contact.id}
                                        defaultEmail={contact.email}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-gray-500 text-sm px-4">
                                            Guarda el contacto primero para registrar actividades
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && contact && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg p-5 sm:p-6 w-full sm:max-w-md safe-bottom">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Contacto</h3>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base">
                            ¿Estás seguro de que deseas eliminar a <strong>{contact.fullName}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <form action={deleteContact.bind(null, contact.id)} className="w-full sm:w-auto">
                                <DeleteButton />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
