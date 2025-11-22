"use client";

import { logout } from "@/actions/auth";

export function LogoutButton() {
    return (
        <form action={logout}>
            <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700 transition-colors"
            >
                Log Out
            </button>
        </form>
    );
}
