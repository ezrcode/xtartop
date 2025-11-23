"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Table2, LayoutGrid } from "lucide-react";
import { Deal, Company, Contact, User, DealStatus } from "@prisma/client";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core";
import { updateDealStatus } from "@/actions/deals";

type DealWithRelations = Deal & {
    company?: Company | null;
    contact?: Contact | null;
    createdBy?: Pick<User, 'id' | 'name' | 'email' | 'photoUrl'> | null;
};

interface DealsClientPageProps {
    deals: DealWithRelations[];
    defaultView?: "table" | "kanban";
}

const dealStatusConfig = {
    PROSPECCION: { label: "Prospección", color: "bg-gray-100 text-gray-800" },
    CALIFICACION: { label: "Calificación", color: "bg-blue-100 text-blue-800" },
    NEGOCIACION: { label: "Negociación", color: "bg-yellow-100 text-yellow-800" },
    FORMALIZACION: { label: "Formalización", color: "bg-purple-100 text-purple-800" },
    CIERRE_GANADO: { label: "Cierre ganado", color: "bg-success-green/10 text-success-green" },
    CIERRE_PERDIDO: { label: "Cierre perdido", color: "bg-error-red/10 text-error-red" },
    NO_CALIFICADOS: { label: "No calificados", color: "bg-gray-100 text-gray-600" },
};

const kanbanColumns = [
    "PROSPECCION",
    "CALIFICACION",
    "NEGOCIACION",
    "FORMALIZACION",
    "CIERRE_GANADO",
    "CIERRE_PERDIDO",
] as const;

// DealCard Component with draggable functionality
function DealCard({ deal, isDragging = false }: { deal: DealWithRelations, isDragging?: boolean }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: deal.id,
    });

    const formatCurrency = (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numValue);
    };

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border border-graphite-gray rounded-lg p-3 hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''}`}
        >
            {/* Drag Handle & Title */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <Link 
                        href={`/app/deals/${deal.id}`}
                        className="text-sm font-semibold text-founder-blue hover:text-ocean-blue hover:underline line-clamp-2 block"
                    >
                        {deal.name}
                    </Link>
                </div>
                {/* Drag Handle */}
                <div 
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 rounded"
                    {...attributes}
                    {...listeners}
                    title="Arrastra para mover"
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="text-gray-400"
                    >
                        <circle cx="9" cy="5" r="1"/>
                        <circle cx="9" cy="12" r="1"/>
                        <circle cx="9" cy="19" r="1"/>
                        <circle cx="15" cy="5" r="1"/>
                        <circle cx="15" cy="12" r="1"/>
                        <circle cx="15" cy="19" r="1"/>
                    </svg>
                </div>
            </div>

            {/* Value */}
            <p className="text-base font-bold text-xtartop-black mb-2">
                {formatCurrency(Number(deal.value))}
            </p>

            {/* Company & Contact */}
            {(deal.company || deal.contact) && (
                <div className="space-y-0.5 text-xs text-gray-600 mb-2">
                    {deal.company && (
                        <div className="truncate">
                            <span className="text-gray-500">Empresa:</span> {deal.company.name}
                        </div>
                    )}
                    {deal.contact && (
                        <div className="truncate">
                            <span className="text-gray-500">Contacto:</span> {deal.contact.fullName}
                        </div>
                    )}
                </div>
            )}

            {/* Created By Avatar & Date */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-1.5">
                    {deal.createdBy?.photoUrl ? (
                        <img
                            src={deal.createdBy.photoUrl}
                            alt={deal.createdBy.name || ""}
                            className="h-5 w-5 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-founder-blue to-ocean-blue flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-white">
                                {deal.createdBy?.name?.charAt(0) || deal.createdBy?.email?.charAt(0) || "?"}
                            </span>
                        </div>
                    )}
                    <span className="text-xs text-gray-500 truncate">
                        {deal.createdBy?.name || deal.createdBy?.email || "Usuario"}
                    </span>
                </div>
                <span className="text-[10px] text-gray-400">
                    {new Date(deal.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
}

// Droppable Column Component
function KanbanColumn({ status, deals }: { status: DealStatus, deals: DealWithRelations[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    return (
        <div className="flex-shrink-0 w-72">
            <div className={`bg-white rounded-lg border shadow-sm transition-colors ${isOver ? 'border-founder-blue border-2' : 'border-graphite-gray'}`}>
                {/* Column Header */}
                <div className="px-3 py-2.5 border-b border-graphite-gray">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-dark-slate">
                            {dealStatusConfig[status].label}
                        </h3>
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                            {deals.length}
                        </span>
                    </div>
                </div>

                {/* Cards Container */}
                <div
                    ref={setNodeRef}
                    className={`p-3 space-y-2.5 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto transition-colors ${isOver ? 'bg-founder-blue/5' : ''}`}
                >
                    {deals.length > 0 ? (
                        deals.map((deal) => (
                            <DealCard key={deal.id} deal={deal} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-sm text-gray-400">
                            Sin negocios
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function DealsClientPage({ deals: initialDeals, defaultView = "table" }: DealsClientPageProps) {
    const [viewMode, setViewMode] = useState<"table" | "kanban">(defaultView);
    const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals);
    const [activeDeal, setActiveDeal] = useState<DealWithRelations | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Permite clicks normales, solo activa drag después de 8px
            },
        })
    );

    const dealsByStatus = kanbanColumns.reduce((acc, status) => {
        acc[status] = deals.filter(deal => deal.status === status);
        return acc;
    }, {} as Record<string, DealWithRelations[]>);

    const formatCurrency = (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numValue);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const dealId = event.active.id as string;
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
            setActiveDeal(deal);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDeal(null);

        if (!over) return;

        const dealId = active.id as string;
        const newStatus = over.id as DealStatus;
        const deal = deals.find(d => d.id === dealId);

        if (!deal || deal.status === newStatus) return;

        // Actualización optimista - actualiza UI inmediatamente
        const oldStatus = deal.status;
        setDeals(prevDeals =>
            prevDeals.map(d =>
                d.id === dealId ? { ...d, status: newStatus } : d
            )
        );

        // Actualiza en el servidor
        try {
            await updateDealStatus(dealId, newStatus);
        } catch (error) {
            console.error("Error updating deal status:", error);
            // Revertir el cambio si falla
            setDeals(prevDeals =>
                prevDeals.map(d =>
                    d.id === dealId ? { ...d, status: oldStatus } : d
                )
            );
        }
    };

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-xtartop-black">Negocios</h1>
                        <p className="text-dark-slate mt-2 text-sm sm:text-base">
                            Gestiona tu pipeline de ventas y oportunidades
                        </p>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                        {/* View Toggle */}
                        <div className="inline-flex rounded-md shadow-sm">
                            <button
                                onClick={() => setViewMode("table")}
                                className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border ${
                                    viewMode === "table"
                                        ? "bg-xtartop-black text-white border-xtartop-black"
                                        : "bg-white text-dark-slate border-graphite-gray hover:bg-gray-50"
                                } rounded-l-md transition-colors`}
                            >
                                <Table2 size={16} className="sm:mr-2" />
                                <span className="hidden sm:inline">Tabla</span>
                            </button>
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-t border-r border-b ${
                                    viewMode === "kanban"
                                        ? "bg-xtartop-black text-white border-xtartop-black"
                                        : "bg-white text-dark-slate border-graphite-gray hover:bg-gray-50"
                                } rounded-r-md transition-colors`}
                            >
                                <LayoutGrid size={16} className="sm:mr-2" />
                                <span className="hidden sm:inline">Kanban</span>
                            </button>
                        </div>

                        <Link
                            href="/app/deals/new"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900 transition-colors"
                        >
                            <Plus size={20} className="mr-2" />
                            <span className="hidden sm:inline">Nuevo Negocio</span>
                            <span className="sm:hidden">Nuevo</span>
                        </Link>
                    </div>
                </div>

                {/* Table View */}
                {viewMode === "table" && (
                    <div className="bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden">
                        {deals.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 px-4">
                                <p className="text-dark-slate text-base sm:text-lg">No hay negocios registrados</p>
                                <Link
                                    href="/app/deals/new"
                                    className="inline-flex items-center px-4 py-2 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Agregar primer negocio
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-graphite-gray">
                                        <thead className="bg-soft-gray">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Nombre
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Empresa
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Contacto
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Valor
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Tipo
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                                    Estado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-graphite-gray">
                                            {deals.map((deal) => (
                                                <tr key={deal.id} className="hover:bg-soft-gray transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <Link
                                                            href={`/app/deals/${deal.id}`}
                                                            className="text-sm font-medium text-founder-blue hover:text-ocean-blue"
                                                        >
                                                            {deal.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {deal.company ? (
                                                            <Link
                                                                href={`/app/companies/${deal.company.id}`}
                                                                className="text-sm text-founder-blue hover:text-ocean-blue"
                                                            >
                                                                {deal.company.name}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {deal.contact ? (
                                                            <Link
                                                                href={`/app/contacts/${deal.contact.id}`}
                                                                className="text-sm text-founder-blue hover:text-ocean-blue"
                                                            >
                                                                {deal.contact.fullName}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-dark-slate">
                                                            {formatCurrency(Number(deal.value))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-dark-slate">
                                                            {deal.type === "CLIENTE_NUEVO" ? "Cliente nuevo" : deal.type === "UPSELLING" ? "Upselling" : "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dealStatusConfig[deal.status].color}`}>
                                                            {dealStatusConfig[deal.status].label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden divide-y divide-graphite-gray">
                                    {deals.map((deal) => (
                                        <Link
                                            key={deal.id}
                                            href={`/app/deals/${deal.id}`}
                                            className="block p-4 hover:bg-soft-gray transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="text-base font-semibold text-founder-blue flex-1">
                                                    {deal.name}
                                                </h3>
                                                <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${dealStatusConfig[deal.status].color}`}>
                                                    {dealStatusConfig[deal.status].label}
                                                </span>
                                            </div>
                                            <p className="text-lg font-bold text-xtartop-black mb-2">
                                                {formatCurrency(Number(deal.value))}
                                            </p>
                                            <div className="space-y-1 text-sm text-dark-slate">
                                                {deal.company && (
                                                    <p>
                                                        <span className="font-medium">Empresa:</span> {deal.company.name}
                                                    </p>
                                                )}
                                                {deal.contact && (
                                                    <p>
                                                        <span className="font-medium">Contacto:</span> {deal.contact.fullName}
                                                    </p>
                                                )}
                                                <p>
                                                    <span className="font-medium">Tipo:</span> {deal.type === "CLIENTE_NUEVO" ? "Cliente nuevo" : "Upselling"}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Kanban View */}
                {viewMode === "kanban" && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="overflow-x-auto pb-4">
                            <div className="inline-flex space-x-4 min-w-full">
                                {kanbanColumns.map((status) => (
                                    <KanbanColumn
                                        key={status}
                                        status={status as DealStatus}
                                        deals={dealsByStatus[status] || []}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeDeal && <DealCard deal={activeDeal} isDragging />}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
