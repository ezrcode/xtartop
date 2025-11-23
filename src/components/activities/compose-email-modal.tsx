"use client";

import { useState, useRef } from "react";
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
                    formRef.current?.reset();
                    setAttachments([]);
                    onClose();
                }, 1000);
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
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-xtartop-black">Nuevo Email</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form */}
                    <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
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
                            <label htmlFor="to" className="block text-sm font-medium text-dark-slate mb-2">
                                Para
                            </label>
                            <input
                                type="email"
                                name="to"
                                id="to"
                                defaultValue={toEmail}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                placeholder="destinatario@email.com"
                            />
                        </div>

                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-dark-slate mb-2">
                                Asunto
                            </label>
                            <input
                                type="text"
                                name="subject"
                                id="subject"
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
                                placeholder="Asunto del email"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label htmlFor="body" className="block text-sm font-medium text-dark-slate mb-2">
                                Mensaje
                            </label>
                            <textarea
                                name="body"
                                id="body"
                                rows={10}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-founder-blue focus:border-founder-blue sm:text-sm"
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
                                className="inline-flex items-center px-3 py-2 border border-graphite-gray rounded-md shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors"
                            >
                                <Paperclip size={16} className="mr-2" />
                                Adjuntar archivos
                            </button>

                            {attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                                        >
                                            <span className="text-sm text-dark-slate">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(index)}
                                                className="text-error-red hover:text-red-700"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-graphite-gray rounded-md shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-founder-blue hover:bg-ocean-blue transition-colors disabled:opacity-50"
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
