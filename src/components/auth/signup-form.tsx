"use client";

import { useFormState, useFormStatus } from "react-dom";
import { register } from "@/actions/auth";
import Link from "next/link";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center items-center min-h-[44px] px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nearby-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? "Creando cuenta..." : "Registrarse"}
        </button>
    );
}

export function SignupForm() {
    const [state, action] = useFormState(register, undefined);

    return (
        <form action={action} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)]">
                    Nombre completo
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Juan Pérez"
                    required
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                />
                {state?.errors?.name && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.name}</p>
                )}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                    Correo electrónico
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    required
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                />
                {state?.errors?.email && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.email}</p>
                )}
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                />
                {state?.errors?.password && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.password}</p>
                )}
            </div>

            <div>
                <label htmlFor="workspaceName" className="block text-sm font-medium text-[var(--foreground)]">
                    Nombre del workspace
                </label>
                <input
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    placeholder="Mi Empresa"
                    required
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                />
                {state?.errors?.workspaceName && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.workspaceName}</p>
                )}
            </div>

            {state?.message && (
                <div className="p-3 rounded-md bg-soft-gray text-sm text-error-red">
                    {state.message}
                </div>
            )}

            <SubmitButton />

            <div className="text-center text-sm text-[var(--foreground)]">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" className="font-medium text-nearby-dark dark:text-nearby-dark-300 hover:text-nearby-dark-600">
                    Iniciar sesión
                </Link>
            </div>
        </form>
    );
}
