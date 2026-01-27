"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, FileText, ExternalLink } from "lucide-react";

interface PdfUploadProps {
    currentFile?: string | null;
    onFileChange: (url: string | null) => void;
    category: string;
    folder?: string;
    className?: string;
    label?: string;
    disabled?: boolean;
}

export function PdfUpload({
    currentFile,
    onFileChange,
    category,
    folder = "uploads",
    className = "",
    label,
    disabled = false,
}: PdfUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(currentFile || null);
    const [fileName, setFileName] = useState<string | null>(
        currentFile ? currentFile.split("/").pop() || "archivo.pdf" : null
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsUploading(true);
        setFileName(file.name);

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
                throw new Error(data.error || "Error al subir archivo");
            }

            setFileUrl(data.url);
            onFileChange(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al subir archivo");
            setFileUrl(currentFile || null);
            setFileName(currentFile ? currentFile.split("/").pop() || null : null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async () => {
        if (fileUrl && fileUrl.includes("vercel-storage.com")) {
            try {
                await fetch("/api/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: fileUrl }),
                });
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }
        setFileUrl(null);
        setFileName(null);
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-dark-slate mb-1.5">
                    {label}
                </label>
            )}
            
            <div className="flex items-center gap-3">
                {fileUrl ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-graphite-gray rounded-lg flex-1 min-w-0">
                        <FileText size={18} className="text-nearby-accent flex-shrink-0" />
                        <span className="text-sm text-dark-slate truncate flex-1">
                            {fileName || "archivo.pdf"}
                        </span>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nearby-accent hover:text-nearby-accent-600 flex-shrink-0"
                            title="Abrir archivo"
                        >
                            <ExternalLink size={16} />
                        </a>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="text-gray-400 hover:text-error-red flex-shrink-0"
                                title="Eliminar"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => !disabled && fileInputRef.current?.click()}
                        disabled={isUploading || disabled}
                        className={`flex items-center gap-2 px-4 py-2 border border-graphite-gray rounded-lg text-sm font-medium transition-colors ${
                            disabled 
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                : "bg-white text-dark-slate hover:bg-gray-50"
                        }`}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Subiendo...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                Subir PDF
                            </>
                        )}
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-error-red">{error}</p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={disabled}
                className="hidden"
            />
        </div>
    );
}
