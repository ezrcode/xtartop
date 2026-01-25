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

function SubmitButton({ actionName, label, loadingLabel, icon: Icon, variant = "primary" }: {
    actionName: string;
    label: string;
    loadingLabel?: string;
    icon?: React.ElementType;
    variant?: "primary" | "secondary" | "danger";
}) {
    const { pending } = useFormStatus();

    const baseClasses = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
    const variants = {
        primary: "text-white bg-nearby-dark hover:bg-gray-900 focus:ring-nearby-dark",
        secondary: "text-dark-slate bg-white border border-graphite-gray hover:bg-gray-50 focus:ring-nearby-accent",
        danger: "text-white bg-error-red hover:bg-red-700 focus:ring-error-red",
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
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    {loadingLabel || "Guardando..."}
                </>
            ) : (
                <>
                    {Icon && <Icon size={16} className="mr-2" />}
                    {label}
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
            className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (
                <span className="flex items-center">
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
                {/* Command Bar */}
                <div className="sticky top-0 z-10 bg-white border-b border-graphite-gray shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/app/contacts"
                                    className="p-2 text-gray-400 hover:text-dark-slate rounded-full hover:bg-gray-100"
                                >
                                    <ArrowLeft size={20} />
                                </Link>
                                <h1 className="text-xl font-bold text-nearby-dark">
                                    {isEditMode ? contact?.fullName : "Nuevo Contacto"}
                                </h1>
                            </div>
                            <div className="flex items-center space-x-3">
                                <SubmitButton
                                    actionName="save"
                                    label="Guardar"
                                    loadingLabel="Guardando..."
                                    icon={Save}
                                    variant="primary"
                                />
                                <SubmitButton
                                    actionName="saveAndClose"
                                    label="Guardar y cerrar"
                                    loadingLabel="Guardando..."
                                    icon={Save}
                                    variant="secondary"
                                />

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

                        {/* Left Column: Form Fields */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 space-y-6">
                                
                                {state?.message && (
                                    <div className={`p-4 rounded-md ${
                                        state.message.toLowerCase().includes("éxito") || state.message.toLowerCase().includes("success") || state.message.toLowerCase().includes("creado") || state.message.toLowerCase().includes("actualizado")
                                            ? "bg-green-50 text-green-800" 
                                            : "bg-red-50 text-red-800"
                                    }`}>
                                        {state.message}
                                    </div>
                                )}

                                {/* General Info */}
                                <div>
                                    <h3 className="text-lg font-medium text-dark-slate mb-4">Información General</h3>
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                                        {/* Photo Placeholder */}
                                        <div className="sm:col-span-6 flex items-center space-x-4">
                                            <div className="h-16 w-16 rounded-full bg-soft-gray flex items-center justify-center text-gray-400">
                                                <span className="text-2xl font-bold">
                                                    {contact?.fullName ? contact.fullName.charAt(0).toUpperCase() : "?"}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Foto de perfil (Próximamente)
                                            </div>
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label htmlFor="fullName" className="block text-sm font-medium text-dark-slate">
                                                Nombre completo <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                id="fullName"
                                                defaultValue={contact?.fullName}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                            {state?.errors?.fullName && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.fullName}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="title" className="block text-sm font-medium text-dark-slate">
                                                Cargo
                                            </label>
                                            <input
                                                type="text"
                                                name="title"
                                                id="title"
                                                defaultValue={contact?.title || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="companyId" className="block text-sm font-medium text-dark-slate">
                                                Empresa
                                            </label>
                                            <select
                                                id="companyId"
                                                name="companyId"
                                                defaultValue={contact?.companyId || "null"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
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

                                <div className="border-t border-graphite-gray pt-6">
                                    <h3 className="text-lg font-medium text-dark-slate mb-4">Contacto</h3>
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                        <div className="sm:col-span-3">
                                            <label htmlFor="email" className="block text-sm font-medium text-dark-slate">
                                                Correo electrónico <span className="text-error-red">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                defaultValue={contact?.email}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                            {state?.errors?.email && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="mobile" className="block text-sm font-medium text-dark-slate">
                                                Móvil
                                            </label>
                                            <input
                                                type="tel"
                                                name="mobile"
                                                id="mobile"
                                                defaultValue={contact?.mobile || ""}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label htmlFor="instagramUrl" className="block text-sm font-medium text-dark-slate">
                                                Instagram (URL)
                                            </label>
                                            <input
                                                type="url"
                                                name="instagramUrl"
                                                id="instagramUrl"
                                                defaultValue={contact?.instagramUrl || ""}
                                                placeholder="https://instagram.com/..."
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
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
                                                defaultValue={contact?.linkedinUrl || ""}
                                                placeholder="https://linkedin.com/in/..."
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                                            />
                                            {state?.errors?.linkedinUrl && (
                                                <p className="mt-1 text-sm text-error-red">{state.errors.linkedinUrl}</p>
                                            )}
                                        </div>
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
                                                defaultValue={contact?.status || "PROSPECTO"}
                                                className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
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
                                                <label className="block text-sm font-medium text-gray-500">
                                                    Creado el
                                                </label>
                                                <div className="mt-2 text-sm text-dark-slate">
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
                            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 h-full min-h-[400px]">
                                {isEditMode && contact ? (
                                    <ActivitiesWithSuspense
                                        entityType="contact"
                                        entityId={contact.id}
                                        defaultEmail={contact.email}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <p className="text-gray-500">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar Contacto</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar a <strong>{contact.fullName}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirmOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <form action={deleteContact.bind(null, contact.id)}>
                                <DeleteButton />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
