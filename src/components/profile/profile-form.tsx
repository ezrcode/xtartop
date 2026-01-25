"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { User, Lock, Settings, Save, Mail } from "lucide-react";
import { updateProfile, updatePassword, updatePreferences, ProfileState, PasswordState, PreferencesState } from "@/actions/profile";
import { DealViewPreference } from "@prisma/client";
import { EmailConfigTab } from "../settings/email-config-tab";

interface ProfileFormProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        photoUrl: string | null;
        dealsViewPref: DealViewPreference;
        createdAt: Date;
    };
    emailConfig: {
        emailConfigured: boolean;
        emailFromAddress: string | null;
        emailFromName: string | null;
        emailPassword: string | null;
    } | null;
}

// Profile Tab Component
function ProfileTab({ user }: { user: ProfileFormProps['user'] }) {
    const initialProfileState: ProfileState = { message: "", errors: {} };
    const [profileState, profileAction] = useFormState(updateProfile, initialProfileState);

    return (
        <form action={profileAction} className="space-y-6">
            {profileState?.message && (
                <div className={`p-4 rounded-md ${profileState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {profileState.message}
                </div>
            )}

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-2">
                    Nombre Completo
                </label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    defaultValue={user.name || ""}
                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {profileState?.errors?.name && (
                    <p className="mt-1 text-sm text-error-red">{profileState.errors.name}</p>
                )}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-2">
                    Email
                </label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={user.email}
                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {profileState?.errors?.email && (
                    <p className="mt-1 text-sm text-error-red">{profileState.errors.email}</p>
                )}
            </div>

            <div>
                <label htmlFor="photoUrl" className="block text-sm font-medium text-dark-slate mb-2">
                    URL de Foto de Perfil
                </label>
                <input
                    type="url"
                    name="photoUrl"
                    id="photoUrl"
                    defaultValue={user.photoUrl || ""}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {profileState?.errors?.photoUrl && (
                    <p className="mt-1 text-sm text-error-red">{profileState.errors.photoUrl}</p>
                )}
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
    );
}

// Password Tab Component
function PasswordTab() {
    const initialPasswordState: PasswordState = { message: "", errors: {} };
    const [passwordState, passwordAction] = useFormState(updatePassword, initialPasswordState);

    return (
        <form action={passwordAction} className="space-y-6">
            {passwordState?.message && (
                <div className={`p-4 rounded-md ${passwordState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {passwordState.message}
                </div>
            )}

            <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-dark-slate mb-2">
                    Contraseña Actual
                </label>
                <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {passwordState?.errors?.currentPassword && (
                    <p className="mt-1 text-sm text-error-red">{passwordState.errors.currentPassword}</p>
                )}
            </div>

            <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-dark-slate mb-2">
                    Nueva Contraseña
                </label>
                <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    required
                    minLength={6}
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {passwordState?.errors?.newPassword && (
                    <p className="mt-1 text-sm text-error-red">{passwordState.errors.newPassword}</p>
                )}
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-slate mb-2">
                    Confirmar Nueva Contraseña
                </label>
                <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    minLength={6}
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {passwordState?.errors?.confirmPassword && (
                    <p className="mt-1 text-sm text-error-red">{passwordState.errors.confirmPassword}</p>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                >
                    <Save size={16} className="mr-2" />
                    Actualizar Contraseña
                </button>
            </div>
        </form>
    );
}

// Preferences Tab Component
function PreferencesTab({ user }: { user: ProfileFormProps['user'] }) {
    const initialPreferencesState: PreferencesState = { message: "", errors: {} };
    const [preferencesState, preferencesAction] = useFormState(updatePreferences, initialPreferencesState);

    return (
        <form action={preferencesAction} className="space-y-6">
            {preferencesState?.message && (
                <div className={`p-4 rounded-md ${preferencesState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {preferencesState.message}
                </div>
            )}

            <div>
                <label htmlFor="dealsViewPref" className="block text-sm font-medium text-dark-slate mb-3">
                    Vista Predeterminada de Negocios
                </label>
                <div className="space-y-3">
                    <label className="flex items-center p-4 border border-graphite-gray rounded-lg cursor-pointer hover:bg-soft-gray transition-colors">
                        <input
                            type="radio"
                            name="dealsViewPref"
                            value="TABLE"
                            defaultChecked={user.dealsViewPref === "TABLE"}
                            className="h-4 w-4 text-nearby-accent focus:ring-nearby-accent border-gray-300"
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-medium text-dark-slate">
                                Vista de Tabla
                            </span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Muestra los negocios en formato de tabla con todas las columnas
                            </span>
                        </div>
                    </label>

                    <label className="flex items-center p-4 border border-graphite-gray rounded-lg cursor-pointer hover:bg-soft-gray transition-colors">
                        <input
                            type="radio"
                            name="dealsViewPref"
                            value="KANBAN"
                            defaultChecked={user.dealsViewPref === "KANBAN"}
                            className="h-4 w-4 text-nearby-accent focus:ring-nearby-accent border-gray-300"
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-medium text-dark-slate">
                                Vista Kanban
                            </span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Muestra los negocios en columnas según su estado
                            </span>
                        </div>
                    </label>
                </div>
                {preferencesState?.errors?.dealsViewPref && (
                    <p className="mt-1 text-sm text-error-red">{preferencesState.errors.dealsViewPref}</p>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                >
                    <Save size={16} className="mr-2" />
                    Guardar Preferencias
                </button>
            </div>
        </form>
    );
}

export function ProfileForm({ user, emailConfig }: ProfileFormProps) {
    const [activeTab, setActiveTab] = useState<"profile" | "password" | "email" | "preferences">("profile");

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-nearby-dark">Mi Perfil</h1>
                    <p className="text-dark-slate mt-2">
                        Gestiona tu información personal y preferencias
                    </p>
                </div>

                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray">
                    {/* Tabs Navigation */}
                    <div className="border-b border-graphite-gray">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "profile"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <User size={16} className="mr-2" />
                                Información Personal
                            </button>
                            <button
                                onClick={() => setActiveTab("password")}
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "password"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Lock size={16} className="mr-2" />
                                Contraseña
                            </button>
                            <button
                                onClick={() => setActiveTab("email")}
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "email"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Mail size={16} className="mr-2" />
                                Email
                            </button>
                            <button
                                onClick={() => setActiveTab("preferences")}
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === "preferences"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Settings size={16} className="mr-2" />
                                Preferencias
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === "profile" && <ProfileTab user={user} />}
                        {activeTab === "password" && <PasswordTab />}
                        {activeTab === "email" && <EmailConfigTab emailConfig={emailConfig} />}
                        {activeTab === "preferences" && <PreferencesTab user={user} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
