"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
    currentImage?: string | null;
    onImageChange: (url: string | null) => void;
    category: "profile" | "logo" | "attachment";
    folder?: string;
    className?: string;
    size?: "sm" | "md" | "lg";
    shape?: "circle" | "square";
    label?: string;
}

const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
};

export function ImageUpload({
    currentImage,
    onImageChange,
    category,
    folder = "uploads",
    className = "",
    size = "md",
    shape = "circle",
    label,
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsUploading(true);

        // Mostrar preview local inmediatamente
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", category);
            formData.append("folder", folder);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al subir imagen");
            }

            setPreview(data.url);
            onImageChange(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al subir imagen");
            setPreview(currentImage || null);
        } finally {
            setIsUploading(false);
            URL.revokeObjectURL(localPreview);
        }
    };

    const handleRemove = async () => {
        if (preview && preview.includes("vercel-storage.com")) {
            try {
                await fetch("/api/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: preview }),
                });
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }
        setPreview(null);
        onImageChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-dark-slate mb-2">
                    {label}
                </label>
            )}
            
            <div className="flex items-center gap-4">
                {/* Image Preview */}
                <div
                    className={`${sizeClasses[size]} ${shapeClass} bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-nearby-accent transition-colors`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : preview ? (
                        <>
                            <Image
                                src={preview}
                                alt="Preview"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                        </>
                    ) : (
                        <Upload className="w-6 h-6 text-gray-400" />
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-sm text-nearby-accent hover:text-nearby-accent-600 font-medium disabled:opacity-50"
                    >
                        {isUploading ? "Subiendo..." : preview ? "Cambiar" : "Subir imagen"}
                    </button>
                    
                    {preview && !isUploading && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="text-sm text-gray-500 hover:text-error-red font-medium flex items-center gap-1"
                        >
                            <X size={14} />
                            Eliminar
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <p className="mt-2 text-sm text-error-red">{error}</p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}
