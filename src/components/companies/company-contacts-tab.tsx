"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Users, Pencil, Trash2, Mail, Phone, Instagram, Linkedin } from "lucide-react";
import { createCompanyContact, updateCompanyContact, deleteCompanyContact } from "@/actions/contacts";
import { ContactStatus } from "@prisma/client";
import type { Contact } from "@prisma/client";

interface CompanyContactsTabProps {
    companyId: string;
    contacts: Contact[];
}

interface ContactFormData {
    fullName: string;
    email: string;
    title: string;
    mobile: string;
    instagramUrl: string;
    linkedinUrl: string;
    status: ContactStatus;
}

const emptyFormData: ContactFormData = {
    fullName: "",
    email: "",
    title: "",
    mobile: "",
    instagramUrl: "",
    linkedinUrl: "",
    status: ContactStatus.PROSPECTO,
};

export function CompanyContactsTab({ companyId, contacts: initialContacts }: CompanyContactsTabProps) {
    const router = useRouter();
    const [contacts, setContacts] = useState(initialContacts);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState<Contact | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formData, setFormData] = useState<ContactFormData>(emptyFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync with props
    useEffect(() => {
        setContacts(initialContacts);
    }, [initialContacts]);

    const handleOpenCreate = () => {
        setEditingContact(null);
        setFormData(emptyFormData);
        setError(null);
        setShowModal(true);
    };

    const handleOpenEdit = (contact: Contact) => {
        setEditingContact(contact);
        setFormData({
            fullName: contact.fullName,
            email: contact.email,
            title: contact.title || "",
            mobile: contact.mobile || "",
            instagramUrl: contact.instagramUrl || "",
            linkedinUrl: contact.linkedinUrl || "",
            status: contact.status,
        });
        setError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingContact(null);
        setFormData(emptyFormData);
        setError(null);
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) {
            setError("El nombre es requerido");
            return;
        }
        if (!formData.email.trim()) {
            setError("El correo es requerido");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (editingContact) {
                // Update
                const result = await updateCompanyContact(editingContact.id, {
                    fullName: formData.fullName.trim(),
                    email: formData.email.trim(),
                    title: formData.title.trim() || undefined,
                    mobile: formData.mobile.trim() || undefined,
                    instagramUrl: formData.instagramUrl.trim() || undefined,
                    linkedinUrl: formData.linkedinUrl.trim() || undefined,
                    status: formData.status,
                });

                if ("error" in result && result.error) {
                    setError(result.error);
                } else {
                    handleCloseModal();
                    router.refresh();
                }
            } else {
                // Create
                const result = await createCompanyContact(companyId, {
                    fullName: formData.fullName.trim(),
                    email: formData.email.trim(),
                    title: formData.title.trim() || undefined,
                    mobile: formData.mobile.trim() || undefined,
                    instagramUrl: formData.instagramUrl.trim() || undefined,
                    linkedinUrl: formData.linkedinUrl.trim() || undefined,
                });

                if ("error" in result && result.error) {
                    setError(result.error);
                } else if (result.contact) {
                    setContacts(prev => [result.contact!, ...prev]);
                    handleCloseModal();
                    router.refresh();
                }
            }
        } catch {
            setError("Error al guardar el contacto");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!showDeleteModal) return;

        setLoading(true);

        try {
            const result = await deleteCompanyContact(showDeleteModal.id);

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setContacts(prev => prev.filter(c => c.id !== showDeleteModal.id));
                setShowDeleteModal(null);
                router.refresh();
            }
        } catch {
            setError("Error al eliminar el contacto");
        }

        setLoading(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-nearby-dark flex items-center gap-2">
                    <Users size={18} />
                    Contactos de la Empresa
                </h3>
                <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-nearby-accent text-white hover:bg-nearby-dark transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Error Message */}
            {error && !showModal && (
                <div className="bg-error-red/10 border border-error-red text-error-red px-3 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Contacts Table */}
            <div className="border border-graphite-gray rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-graphite-gray">
                        <thead className="bg-soft-gray sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Correo
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Cargo
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-dark-slate uppercase tracking-wider w-24">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-graphite-gray">
                            {contacts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                                        No hay contactos registrados
                                    </td>
                                </tr>
                            ) : (
                                contacts.map((contact) => (
                                    <tr key={contact.id} className="hover:bg-gray-50 group">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-dark-slate">
                                                {contact.fullName}
                                            </div>
                                            {contact.mobile && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} />
                                                    {contact.mobile}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                <Mail size={12} className="text-gray-400" />
                                                {contact.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {contact.title || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(contact)}
                                                    className="p-1.5 text-gray-400 hover:text-nearby-accent rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteModal(contact)}
                                                    className="p-1.5 text-gray-400 hover:text-error-red rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Contact Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-nearby-dark">
                                {editingContact ? "Editar Contacto" : "Nuevo Contacto"}
                            </h3>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-error-red/10 border border-error-red text-error-red px-3 py-2 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Nombre completo <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Correo electrónico <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="juan@empresa.com"
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Cargo
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="Gerente General"
                                />
                            </div>

                            {/* Mobile */}
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Teléfono móvil
                                </label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="+1 809 555 1234"
                                />
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                        <Instagram size={14} className="inline mr-1" />
                                        Instagram
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.instagramUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, instagramUrl: e.target.value }))}
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                        <Linkedin size={14} className="inline mr-1" />
                                        LinkedIn
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.linkedinUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                            </div>

                            {/* Status (only for editing) */}
                            {editingContact && (
                                <div>
                                    <label className="block text-sm font-medium text-dark-slate mb-1">
                                        Estado
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ContactStatus }))}
                                        className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    >
                                        <option value="PROSPECTO">Prospecto</option>
                                        <option value="POTENCIAL">Potencial</option>
                                        <option value="CLIENTE">Cliente</option>
                                        <option value="INVERSIONISTA">Inversionista</option>
                                        <option value="DESCARTADO">Descartado</option>
                                    </select>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-nearby-accent rounded-md hover:bg-nearby-dark disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Guardar"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-nearby-dark mb-2">
                            Eliminar Contacto
                        </h3>
                        <p className="text-sm text-dark-slate mb-4">
                            ¿Estás seguro que deseas eliminar a <strong>{showDeleteModal.fullName}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(null)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    "Eliminar"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
