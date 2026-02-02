"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { User, Lock, Settings, Save, Mail } from "lucide-react";
import { updateProfile, updatePassword, updatePreferences, ProfileState, PasswordState, PreferencesState } from "@/actions/profile";
import { DealViewPreference, ThemePreference } from "@prisma/client";
import { EmailConfigTab } from "../settings/email-config-tab";
import { ImageUpload } from "../ui/image-upload";
import { ThemeToggle } from "../ui/theme-toggle";

interface ProfileFormProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        photoUrl: string | null;
        dealsViewPref: DealViewPreference;
        themePreference: ThemePreference;
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
    const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl);

    return (
        <form action={profileAction} className="space-y-6">
            {profileState?.message && (
                <div className={`p-4 rounded-md ${profileState.message.includes("success") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    {profileState.message}
                </div>
            )}

            {/* Foto de perfil */}
            <ImageUpload
                currentImage={user.photoUrl}
                onImageChange={(url) => setPhotoUrl(url)}
                category="profile"
                folder="profiles"
                size="lg"
                shape="circle"
                label="Foto de Perfil"
            />
            <input type="hidden" name="photoUrl" value={photoUrl || ""} />

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1.5 sm:mb-2">
                    Nombre Completo
                </label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    defaultValue={user.name || ""}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-graphite-gray rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                />
                {profileState?.errors?.name && (
                    <p className="mt-1 text-sm text-error-red">{profileState.errors.name}</p>
                )}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-1.5 sm:mb-2">
                    Email
                </label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={user.email}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-graphite-gray rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                />
                {profileState?.errors?.email && (
                    <p className="mt-1 text-sm text-error-red">{profileState.errors.email}</p>
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
                <label htmlFor="currentPassword" className="block text-sm font-medium text-dark-slate mb-1.5 sm:mb-2">
                    Contraseña Actual
                </label>
                <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    required
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-graphite-gray rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                />
                {passwordState?.errors?.currentPassword && (
                    <p className="mt-1 text-sm text-error-red">{passwordState.errors.currentPassword}</p>
                )}
            </div>

            <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-dark-slate mb-1.5 sm:mb-2">
                    Nueva Contraseña
                </label>
                <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    required
                    minLength={6}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-graphite-gray rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                />
                {passwordState?.errors?.newPassword && (
                    <p className="mt-1 text-sm text-error-red">{passwordState.errors.newPassword}</p>
                )}
            </div>

            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark-slate mb-1.5 sm:mb-2">
                    Confirmar Nueva Contraseña
                </label>
                <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    minLength={6}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-graphite-gray rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
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
        <div className="space-y-8">
            {/* Theme Preference */}
            <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                    Tema de la Aplicación
                </label>
                <ThemeToggle initialTheme={user.themePreference} variant="buttons" />
                <p className="mt-2 text-xs text-[var(--muted-text)]">
                    Selecciona &quot;Auto&quot; para que el tema cambie según la configuración de tu dispositivo.
                </p>
            </div>

            <div className="border-t border-[var(--card-border)] pt-6">
                <form action={preferencesAction} className="space-y-6">
                    {preferencesState?.message && (
                        <div className={`p-4 rounded-md ${preferencesState.message.includes("success") ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
                            {preferencesState.message}
                        </div>
                    )}

                    <div>
                        <label htmlFor="dealsViewPref" className="block text-sm font-medium text-[var(--foreground)] mb-3">
                            Vista Predeterminada de Negocios
                        </label>
                    <div className="space-y-3">
                        <label className="flex items-center p-4 border border-[var(--card-border)] rounded-lg cursor-pointer hover:bg-[var(--hover-bg)] transition-colors">
                            <input
                                type="radio"
                                name="dealsViewPref"
                                value="TABLE"
                                defaultChecked={user.dealsViewPref === "TABLE"}
                                className="h-4 w-4 text-nearby-accent focus:ring-nearby-accent border-gray-300"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-medium text-[var(--foreground)]">
                                    Vista de Tabla
                                </span>
                                <span className="block text-xs text-[var(--muted-text)] mt-1">
                                    Muestra los negocios en formato de tabla con todas las columnas
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center p-4 border border-[var(--card-border)] rounded-lg cursor-pointer hover:bg-[var(--hover-bg)] transition-colors">
                            <input
                                type="radio"
                                name="dealsViewPref"
                                value="KANBAN"
                                defaultChecked={user.dealsViewPref === "KANBAN"}
                                className="h-4 w-4 text-nearby-accent focus:ring-nearby-accent border-gray-300"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-medium text-[var(--foreground)]">
                                    Vista Kanban
                                </span>
                                <span className="block text-xs text-[var(--muted-text)] mt-1">
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
            </div>
        </div>
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
                    {/* Tabs Navigation - Optimized for iOS */}
                    <div className="border-b border-graphite-gray overflow-x-auto">
                        <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                    activeTab === "profile"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <User size={16} className="mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Información Personal</span>
                                <span className="sm:hidden">Perfil</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("password")}
                                className={`flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                    activeTab === "password"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Lock size={16} className="mr-1.5 sm:mr-2" />
                                Contraseña
                            </button>
                            <button
                                onClick={() => setActiveTab("email")}
                                className={`flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                    activeTab === "email"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Mail size={16} className="mr-1.5 sm:mr-2" />
                                Email
                            </button>
                            <button
                                onClick={() => setActiveTab("preferences")}
                                className={`flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                    activeTab === "preferences"
                                        ? "border-nearby-accent text-nearby-accent"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <Settings size={16} className="mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Preferencias</span>
                                <span className="sm:hidden">Prefs</span>
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
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
