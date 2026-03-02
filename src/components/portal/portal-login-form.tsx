"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { portalLogin } from "@/actions/portal-auth";
import Link from "next/link";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center items-center min-h-[44px] px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nearby-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? "Ingresando..." : "Ingresar"}
        </button>
    );
}

export function PortalLoginForm() {
    const [state, formAction] = useActionState(portalLogin, { error: null });

    return (
        <form action={formAction} className="space-y-6">
            {state?.error && (
                <div className="bg-error-red/10 border border-error-red text-error-red px-4 py-3 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:ring-nearby-accent focus:border-nearby-accent"
                    placeholder="tu@email.com"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:ring-nearby-accent focus:border-nearby-accent"
                    placeholder="••••••••"
                />
            </div>

            <SubmitButton />

            <div className="text-center">
                <Link href="/login" className="text-sm text-nearby-accent hover:text-nearby-dark-600">
                    ¿Eres parte del equipo NEARBY? Ingresa aquí
                </Link>
            </div>
        </form>
    );
}
