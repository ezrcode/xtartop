"use client";

import { useFormState, useFormStatus } from "react-dom";
import { authenticate } from "@/actions/auth";
import Link from "next/link";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-xtartop-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? "Logging in..." : "Log In"}
        </button>
    );
}

export function LoginForm() {
    const [errorMessage, action] = useFormState(authenticate, undefined);

    return (
        <form action={action} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-slate">
                    Email Address
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-slate">
                    Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:outline-none focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                />
            </div>

            {errorMessage && (
                <div className="p-3 rounded-md bg-soft-gray text-sm text-error-red">
                    {errorMessage}
                </div>
            )}

            <SubmitButton />

            <div className="text-center text-sm text-dark-slate">
                Don't have an account?{" "}
                <Link href="/signup" className="font-medium text-founder-blue hover:text-ocean-blue">
                    Sign up
                </Link>
            </div>
        </form>
    );
}
