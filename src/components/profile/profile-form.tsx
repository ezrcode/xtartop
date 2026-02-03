"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { User, Lock, Settings, Save, Mail } from "lucide-react";
import { updateProfile, updatePassword, updatePreferences, updateItemsPerPage, ProfileState, PasswordState, PreferencesState } from "@/actions/profile";
import { DealViewPreference, ThemePreference } from "@prisma/client";
import { EmailConfigTab } from "../settings/email-config-tab";
import { ImageUpload } from "../ui/image-upload";
import { ThemeToggle } from "../ui/theme-toggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ProfileFormProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        photoUrl: string | null;
        dealsViewPref: DealViewPreference;
        themePreference: ThemePreference;
        itemsPerPage: number;
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
        <form action={profileAction} className="space-y-6 max-w-lg">
            {profileState?.message && (
                <div className={`p-4 rounded-xl ${profileState.message.includes("success") ? "bg-success-green/10 text-success-green" : "bg-error-red/10 text-error-red"}`}>
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

            <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                    type="text"
                    name="name"
                    id="name"
                    defaultValue={user.name || ""}
                    error={!!profileState?.errors?.name}
                />
                {profileState?.errors?.name && (
                    <p className="text-sm text-error-red">{profileState.errors.name}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={user.email}
                    error={!!profileState?.errors?.email}
                />
                {profileState?.errors?.email && (
                    <p className="text-sm text-error-red">{profileState.errors.email}</p>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit">
                    <Save size={16} />
                    Guardar Cambios
                </Button>
            </div>
        </form>
    );
}

// Password Tab Component
function PasswordTab() {
    const initialPasswordState: PasswordState = { message: "", errors: {} };
    const [passwordState, passwordAction] = useFormState(updatePassword, initialPasswordState);

    return (
        <form action={passwordAction} className="space-y-6 max-w-lg">
            {passwordState?.message && (
                <div className={`p-4 rounded-xl ${passwordState.message.includes("success") ? "bg-success-green/10 text-success-green" : "bg-error-red/10 text-error-red"}`}>
                    {passwordState.message}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    required
                    error={!!passwordState?.errors?.currentPassword}
                />
                {passwordState?.errors?.currentPassword && (
                    <p className="text-sm text-error-red">{passwordState.errors.currentPassword}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    required
                    minLength={6}
                    error={!!passwordState?.errors?.newPassword}
                />
                {passwordState?.errors?.newPassword && (
                    <p className="text-sm text-error-red">{passwordState.errors.newPassword}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    minLength={6}
                    error={!!passwordState?.errors?.confirmPassword}
                />
                {passwordState?.errors?.confirmPassword && (
                    <p className="text-sm text-error-red">{passwordState.errors.confirmPassword}</p>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit">
                    <Save size={16} />
                    Actualizar Contraseña
                </Button>
            </div>
        </form>
    );
}

// Preferences Tab Component
function PreferencesTab({ user }: { user: ProfileFormProps['user'] }) {
    const initialPreferencesState: PreferencesState = { message: "", errors: {} };
    const [preferencesState, preferencesAction] = useFormState(updatePreferences, initialPreferencesState);
    const [itemsPerPage, setItemsPerPage] = useState(user.itemsPerPage);
    const [savingItemsPerPage, setSavingItemsPerPage] = useState(false);
    const [itemsPerPageMessage, setItemsPerPageMessage] = useState<string | null>(null);

    const handleItemsPerPageChange = async (value: number) => {
        setItemsPerPage(value);
        setSavingItemsPerPage(true);
        setItemsPerPageMessage(null);
        
        const result = await updateItemsPerPage(value);
        
        if (result.success) {
            setItemsPerPageMessage("Guardado");
            setTimeout(() => setItemsPerPageMessage(null), 2000);
        } else {
            setItemsPerPageMessage(result.error || "Error");
        }
        setSavingItemsPerPage(false);
    };

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

            {/* Items Per Page Preference */}
            <div className="border-t border-[var(--card-border)] pt-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                    Items por Página en Tablas
                </label>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
                        {[10, 25, 50].map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleItemsPerPageChange(value)}
                                disabled={savingItemsPerPage}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    itemsPerPage === value
                                        ? "bg-nearby-accent text-white"
                                        : "bg-[var(--card-bg)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
                                } ${savingItemsPerPage ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    {savingItemsPerPage && (
                        <span className="text-xs text-[var(--muted-text)]">Guardando...</span>
                    )}
                    {itemsPerPageMessage && !savingItemsPerPage && (
                        <span className={`text-xs ${itemsPerPageMessage === "Guardado" ? "text-success-green" : "text-error-red"}`}>
                            {itemsPerPageMessage}
                        </span>
                    )}
                </div>
                <p className="mt-2 text-xs text-[var(--muted-text)]">
                    Número de registros a mostrar por página en las tablas de Empresas, Contactos y Negocios.
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
    return (
        <div className="min-h-screen bg-[var(--background)] py-6 sm:py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Mi Perfil</h1>
                    <p className="text-[var(--muted-text)] mt-1 sm:mt-2 text-sm sm:text-base">
                        Gestiona tu información personal y preferencias
                    </p>
                </div>

                <Card>
                    <Tabs defaultValue="profile" className="w-full">
                        {/* Tabs Navigation - iOS optimized: icons only on mobile */}
                        <TabsList variant="underline" className="w-full justify-between sm:justify-start px-2 sm:px-6">
                            <TabsTrigger value="profile" variant="underline" className="flex-1 sm:flex-none">
                                <User size={16} />
                                <span className="hidden sm:inline">Perfil</span>
                            </TabsTrigger>
                            <TabsTrigger value="password" variant="underline" className="flex-1 sm:flex-none">
                                <Lock size={16} />
                                <span className="hidden sm:inline">Contraseña</span>
                            </TabsTrigger>
                            <TabsTrigger value="email" variant="underline" className="flex-1 sm:flex-none">
                                <Mail size={16} />
                                <span className="hidden sm:inline">Email</span>
                            </TabsTrigger>
                            <TabsTrigger value="preferences" variant="underline" className="flex-1 sm:flex-none">
                                <Settings size={16} />
                                <span className="hidden sm:inline">Preferencias</span>
                            </TabsTrigger>
                        </TabsList>

                        <CardContent className="p-4 sm:p-6">
                            <TabsContent value="profile" className="mt-0">
                                <ProfileTab user={user} />
                            </TabsContent>
                            <TabsContent value="password" className="mt-0">
                                <PasswordTab />
                            </TabsContent>
                            <TabsContent value="email" className="mt-0">
                                <EmailConfigTab emailConfig={emailConfig} />
                            </TabsContent>
                            <TabsContent value="preferences" className="mt-0">
                                <PreferencesTab user={user} />
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
