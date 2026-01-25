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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nearby-dark disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label htmlFor="name" className="block text-sm font-medium text-dark-slate">
                    Nombre completo
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Juan Pérez"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {state?.errors?.name && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.name}</p>
                )}
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-slate">
                    Correo electrónico
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {state?.errors?.email && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.email}</p>
                )}
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-slate">
                    Contraseña
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
                />
                {state?.errors?.password && (
                    <p className="mt-1 text-sm text-error-red">{state.errors.password}</p>
                )}
            </div>

            <div>
                <label htmlFor="workspaceName" className="block text-sm font-medium text-dark-slate">
                    Nombre del workspace
                </label>
                <input
                    id="workspaceName"
                    name="workspaceName"
                    type="text"
                    placeholder="Mi Empresa"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-nearby-accent focus:border-nearby-accent sm:text-sm"
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

            <div className="text-center text-sm text-dark-slate">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" className="font-medium text-nearby-accent hover:text-nearby-dark">
                    Iniciar sesión
                </Link>
            </div>
        </form>
    );
}
