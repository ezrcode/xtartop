"use client";

import { useState, useEffect } from "react";
import { WifiOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check initial state
        setIsOffline(!navigator.onLine);

        const handleOnline = () => {
            setIsOffline(false);
            setDismissed(false);
        };
        
        const handleOffline = () => {
            setIsOffline(true);
            setDismissed(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 right-0 z-[100] safe-top"
            >
                <div className="bg-warning-amber text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
                    <WifiOff size={18} />
                    <span className="text-sm font-medium">
                        Sin conexión a internet. Algunas funciones pueden no estar disponibles.
                    </span>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
                    >
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
