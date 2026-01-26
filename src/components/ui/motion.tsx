"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

// Page transition wrapper
export function PageTransition({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
}

// Fade in animation
export function FadeIn({ 
    children, 
    delay = 0,
    duration = 0.3,
    className = ""
}: { 
    children: ReactNode; 
    delay?: number;
    duration?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay, duration }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Slide up animation
export function SlideUp({ 
    children, 
    delay = 0,
    className = ""
}: { 
    children: ReactNode; 
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                delay, 
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Stagger children animation
export function StaggerContainer({ 
    children,
    staggerDelay = 0.1,
    className = ""
}: { 
    children: ReactNode;
    staggerDelay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ 
    children,
    className = ""
}: { 
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: {
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94]
                    }
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Scale on hover
export function ScaleOnHover({ 
    children,
    scale = 1.02,
    className = ""
}: { 
    children: ReactNode;
    scale?: number;
    className?: string;
}) {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Modal animation wrapper
export function ModalTransition({ 
    children,
    isOpen 
}: { 
    children: ReactNode;
    isOpen: boolean;
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30 
                        }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Number counter animation
export function AnimatedNumber({ 
    value, 
    duration = 1,
    className = ""
}: { 
    value: number;
    duration?: number;
    className?: string;
}) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={className}
        >
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration }}
            >
                {value.toLocaleString()}
            </motion.span>
        </motion.span>
    );
}

// Pulse animation for notifications
export function Pulse({ 
    children,
    className = ""
}: { 
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            animate={{ 
                scale: [1, 1.05, 1],
            }}
            transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
