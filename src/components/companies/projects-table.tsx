"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, FolderOpen } from "lucide-react";
import { createProject, updateProjectStatus } from "@/actions/projects";
import type { Project } from "@prisma/client";

interface ProjectsTableProps {
    companyId: string;
    projects: Project[];
}

export function ProjectsTable({ companyId, projects }: ProjectsTableProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!projectName.trim()) {
            setError("El nombre es requerido");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await createProject(companyId, projectName.trim());

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setProjectName("");
                setShowModal(false);
                router.refresh();
            }
        } catch {
            setError("Error al crear el proyecto");
        }

        setLoading(false);
    };

    const handleToggleStatus = async (project: Project) => {
        setUpdatingId(project.id);

        try {
            const newStatus = project.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            await updateProjectStatus(project.id, companyId, newStatus);
            router.refresh();
        } catch {
            console.error("Error updating project status");
        }

        setUpdatingId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-nearby-dark flex items-center gap-2">
                    <FolderOpen size={18} />
                    Proyectos
                </h3>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-nearby-accent text-white hover:bg-nearby-dark transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Projects Table */}
            <div className="border border-graphite-gray rounded-lg overflow-hidden">
                <div className="max-h-[220px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-graphite-gray">
                        <thead className="bg-soft-gray sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-dark-slate uppercase tracking-wider w-32">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-graphite-gray">
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-500">
                                        No hay proyectos registrados
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-dark-slate">
                                            {project.name}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(project)}
                                                disabled={updatingId === project.id}
                                                className={`inline-flex items-center justify-center px-3 py-1 text-xs font-medium rounded-full transition-colors min-w-[80px] ${
                                                    project.status === "ACTIVE"
                                                        ? "bg-success-green/10 text-success-green hover:bg-success-green/20"
                                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                }`}
                                            >
                                                {updatingId === project.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    project.status === "ACTIVE" ? "Activo" : "Inactivo"
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-nearby-dark">Nuevo Proyecto</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    setProjectName("");
                                    setError(null);
                                }}
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
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Nombre del proyecto <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="RESIDENCIAL DEMO I"
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setProjectName("");
                                        setError(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
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
        </div>
    );
}
