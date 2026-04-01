"use client";

import { useState, useTransition, type FormEvent } from "react";
import { portalLogin } from "@/actions/portal-auth";
import Link from "next/link";

export function PortalLoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setError(null);
        startTransition(async () => {
            const result = await portalLogin({ error: null }, formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-error-red/10 border border-error-red text-error-red px-4 py-3 rounded-md text-sm">
                    {error}
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
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
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
                    className="mt-1 block w-full px-3 py-2.5 text-base sm:text-sm border border-[var(--input-border)] rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                    placeholder="••••••••"
                />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center min-h-[44px] px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nearby-dark/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending ? "Ingresando..." : "Ingresar"}
            </button>

            <div className="text-center">
                <Link href="/login" className="text-sm text-nearby-dark dark:text-nearby-dark-300 hover:text-nearby-dark-600">
                    ¿Eres parte del equipo NEARBY? Ingresa aquí
                </Link>
            </div>
        </form>
    );
}
