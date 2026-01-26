"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, FileText, Image as ImageIcon, File } from "lucide-react";

interface UploadedFile {
    url: string;
    filename: string;
    type: string;
    size: number;
}

interface FileUploadProps {
    files: UploadedFile[];
    onFilesChange: (files: UploadedFile[]) => void;
    folder?: string;
    maxFiles?: number;
    accept?: string;
    className?: string;
}

const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUpload({
    files,
    onFilesChange,
    folder = "attachments",
    maxFiles = 5,
    accept = "image/*,.pdf,.doc,.docx",
    className = "",
}: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        if (files.length + selectedFiles.length > maxFiles) {
            setError(`Máximo ${maxFiles} archivos permitidos`);
            return;
        }

        setError(null);
        setIsUploading(true);

        const newFiles: UploadedFile[] = [];

        for (const file of Array.from(selectedFiles)) {
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("category", "attachment");
                formData.append("folder", folder);

                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al subir archivo");
                }

                newFiles.push({
                    url: data.url,
                    filename: data.filename,
                    type: data.type,
                    size: data.size,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al subir archivo");
            }
        }

        if (newFiles.length > 0) {
            onFilesChange([...files, ...newFiles]);
        }

        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemove = async (index: number) => {
        const fileToRemove = files[index];
        
        // Intentar eliminar del storage
        if (fileToRemove.url.includes("vercel-storage.com")) {
            try {
                await fetch("/api/upload", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: fileToRemove.url }),
                });
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }

        const newFiles = files.filter((_, i) => i !== index);
        onFilesChange(newFiles);
    };

    return (
        <div className={className}>
            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-1.5 mb-2">
                    {files.map((file, index) => {
                        const FileIcon = getFileIcon(file.type);
                        return (
                            <div
                                key={`${file.url}-${index}`}
                                className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 group"
                            >
                                <FileIcon size={14} className="text-gray-500 flex-shrink-0" />
                                <span className="flex-1 text-xs text-gray-700 truncate">
                                    {file.filename}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {formatFileSize(file.size)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(index)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-error-red transition-all"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Button */}
            {files.length < maxFiles && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-nearby-accent border border-dashed border-gray-300 rounded-lg hover:border-nearby-accent transition-colors disabled:opacity-50"
                >
                    {isUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Upload size={12} />
                    )}
                    {isUploading ? "Subiendo..." : "Adjuntar archivo"}
                </button>
            )}

            {error && (
                <p className="mt-1 text-xs text-error-red">{error}</p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}
