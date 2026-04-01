"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Paperclip, Send, Loader2 } from "lucide-react";
import { sendEmail } from "@/actions/email";

interface ComposeEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    toEmail?: string;
    companyId?: string;
    contactId?: string;
    dealId?: string;
}

export function ComposeEmailModal({
    isOpen,
    onClose,
    toEmail = "",
    companyId,
    contactId,
    dealId,
}: ComposeEmailModalProps) {
    const router = useRouter();
    const [attachments, setAttachments] = useState<File[]>([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(Array.from(e.target.files));
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setIsPending(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await sendEmail(undefined, formData);

            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.refresh();
                    formRef.current?.reset();
                    setAttachments([]);
                    onClose();
                }, 500);
            } else {
                setError(result.message || "Failed to send email");
            }
        } catch (err: any) {
            setError(err.message || "Failed to send email");
        } finally {
            setIsPending(false);
        }
    };

    // Don't render anything if modal is closed
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-[var(--card-bg)] rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-[var(--card-bg)] flex items-center justify-between p-4 sm:p-6 border-b border-[var(--card-border)] z-10">
                        <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">Nuevo Email</h2>
                        <button
                            onClick={onClose}
                            className="text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors"
                        >
                            <X size={20} className="sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                        {error && (
                            <div className="p-4 rounded-md bg-red-50 text-red-800 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 rounded-md bg-green-50 text-green-800 text-sm">
                                ¡Email enviado exitosamente!
                            </div>
                        )}

                        {/* Hidden fields */}
                        {companyId && <input type="hidden" name="companyId" value={companyId} />}
                        {contactId && <input type="hidden" name="contactId" value={contactId} />}
                        {dealId && <input type="hidden" name="dealId" value={dealId} />}

                        {/* To */}
                        <div>
                            <label htmlFor="to" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                Para
                            </label>
                            <input
                                type="email"
                                name="to"
                                id="to"
                                defaultValue={toEmail}
                                required
                                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-md shadow-sm focus:ring-nearby-dark/15 focus:border-nearby-dark/50 sm:text-sm"
                                placeholder="destinatario@email.com"
                            />
                        </div>

                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                Asunto
                            </label>
                            <input
                                type="text"
                                name="subject"
                                id="subject"
                                required
                                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-md shadow-sm focus:ring-nearby-dark/15 focus:border-nearby-dark/50 sm:text-sm"
                                placeholder="Asunto del email"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label htmlFor="body" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                Mensaje
                            </label>
                            <textarea
                                name="body"
                                id="body"
                                rows={8}
                                required
                                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-md shadow-sm focus:ring-nearby-dark/15 focus:border-nearby-dark/50 text-sm"
                                placeholder="Escribe tu mensaje aquí..."
                            />
                        </div>

                        {/* Attachments */}
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="attachments"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center px-3 py-2 border border-[var(--card-border)] rounded-md shadow-sm text-xs sm:text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                                <Paperclip size={16} className="mr-2" />
                                Adjuntar archivos
                            </button>

                            {attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-[var(--surface-2)] rounded border border-[var(--card-border)]"
                                        >
                                            <span className="text-xs sm:text-sm text-[var(--foreground)] truncate flex-1 mr-2">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(index)}
                                                className="text-error-red hover:text-red-700 flex-shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-[var(--card-border)]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-[var(--card-border)] rounded-md shadow-sm text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 transition-colors disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} className="mr-2" />
                                        Enviar Email
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
