"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Algo salió mal
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    {error.message || "Error desconocido"}
                </p>
                {error.digest && (
                    <p className="text-xs text-gray-400 mb-4 font-mono">
                        Digest: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                >
                    Intentar de nuevo
                </button>
            </div>
        </div>
    );
}
