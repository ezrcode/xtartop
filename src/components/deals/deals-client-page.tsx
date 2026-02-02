"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Table2, LayoutGrid } from "lucide-react";
import { Deal, Company, Contact, User, DealStatus, DealType } from "@prisma/client";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
    useDraggable,
} from "@dnd-kit/core";
import { updateDealStatus } from "@/actions/deals";
import { saveTablePreferences } from "@/actions/table-preferences";
import { DataTable, Column, TablePreferences } from "@/components/ui/data-table";

type DealWithRelations = Deal & {
    company?: Company | null;
    contact?: Contact | null;
    createdBy?: Pick<User, 'id' | 'name' | 'email' | 'photoUrl'> | null;
};

interface DealsClientPageProps {
    deals: DealWithRelations[];
    defaultView?: "table" | "kanban";
    initialTablePreferences?: TablePreferences | null;
}

const dealStatusConfig: Record<DealStatus, { label: string; color: string }> = {
    PROSPECCION: { label: "Prospección", color: "bg-gray-100 text-gray-800" },
    CALIFICACION: { label: "Calificación", color: "bg-blue-100 text-blue-800" },
    NEGOCIACION: { label: "Negociación", color: "bg-yellow-100 text-yellow-800" },
    FORMALIZACION: { label: "Formalización", color: "bg-purple-100 text-purple-800" },
    CIERRE_GANADO: { label: "Cierre ganado", color: "bg-success-green/10 text-success-green" },
    CIERRE_PERDIDO: { label: "Cierre perdido", color: "bg-error-red/10 text-error-red" },
    NO_CALIFICADOS: { label: "No calificados", color: "bg-gray-100 text-gray-600" },
};

const dealTypeConfig: Record<DealType, { label: string }> = {
    CLIENTE_NUEVO: { label: "Cliente nuevo" },
    UPSELLING: { label: "Upselling" },
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
            className={`bg-white border border-graphite-gray rounded-lg p-3 hover:shadow-md transition-shadow touch-manipulation ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            {/* Drag Handle & Title */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <Link 
                        href={`/app/deals/${deal.id}`}
                        className="text-sm font-semibold text-nearby-accent hover:text-nearby-dark active:text-nearby-dark line-clamp-2 block"
                    >
                        {deal.name}
                    </Link>
                </div>
                {/* Drag Handle - más grande para touch */}
                <div 
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1.5 -m-1 hover:bg-gray-100 active:bg-gray-200 rounded-lg touch-manipulation"
                    {...attributes}
                    {...listeners}
                    title="Arrastra para mover"
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
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
            <p className="text-base font-bold text-nearby-dark mb-2">
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
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-dark flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-white">
                                {deal.createdBy?.name?.charAt(0) || deal.createdBy?.email?.charAt(0) || "?"}
                            </span>
                        </div>
                    )}
                    <span className="text-xs text-gray-500 truncate max-w-[80px]">
                        {deal.createdBy?.name || deal.createdBy?.email || "Usuario"}
                    </span>
                </div>
                <span className="text-[10px] text-gray-400">
                    {new Date(deal.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
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

    // Calcular total del valor de los deals en la columna
    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="flex-shrink-0 w-64 sm:w-72">
            <div className={`bg-white rounded-lg border shadow-sm transition-all ${isOver ? 'border-nearby-accent border-2 shadow-md' : 'border-graphite-gray'}`}>
                {/* Column Header */}
                <div className="px-3 py-2.5 border-b border-graphite-gray sticky top-0 bg-white rounded-t-lg z-10">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs sm:text-sm font-semibold text-dark-slate truncate">
                            {dealStatusConfig[status].label}
                        </h3>
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                            {deals.length}
                        </span>
                    </div>
                    {deals.length > 0 && (
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                            {formatCurrency(totalValue)}
                        </p>
                    )}
                </div>

                {/* Cards Container - optimizado para touch scroll */}
                <div
                    ref={setNodeRef}
                    className={`p-2 sm:p-3 space-y-2 min-h-[150px] sm:min-h-[200px] max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto overscroll-contain transition-colors ${isOver ? 'bg-nearby-accent/5' : ''}`}
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {deals.length > 0 ? (
                        deals.map((deal) => (
                            <DealCard key={deal.id} deal={deal} />
                        ))
                    ) : (
                        <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-400">
                            Sin negocios
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Deals Table Component using DataTable
function DealsTable({ deals, initialPreferences }: { deals: DealWithRelations[], initialPreferences?: TablePreferences | null }) {
    const router = useRouter();

    const formatCurrency = (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numValue);
    };

    const columns: Column<DealWithRelations>[] = [
        {
            key: "name",
            header: "Nombre",
            sortable: true,
            hideable: false,
            render: (deal) => (
                <Link
                    href={`/app/deals/${deal.id}`}
                    className="text-sm font-medium text-nearby-accent hover:text-nearby-dark"
                    onClick={(e) => e.stopPropagation()}
                >
                    {deal.name}
                </Link>
            ),
        },
        {
            key: "company",
            header: "Empresa",
            hideable: true,
            defaultVisible: true,
            render: (deal) => (
                deal.company ? (
                    <Link
                        href={`/app/companies/${deal.company.id}`}
                        className="text-sm text-nearby-accent hover:text-nearby-dark"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {deal.company.name}
                    </Link>
                ) : (
                    <span className="text-sm text-gray-400">-</span>
                )
            ),
        },
        {
            key: "contact",
            header: "Contacto",
            hideable: true,
            defaultVisible: true,
            render: (deal) => (
                deal.contact ? (
                    <Link
                        href={`/app/contacts/${deal.contact.id}`}
                        className="text-sm text-nearby-accent hover:text-nearby-dark"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {deal.contact.fullName}
                    </Link>
                ) : (
                    <span className="text-sm text-gray-400">-</span>
                )
            ),
        },
        {
            key: "value",
            header: "Valor",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (deal) => (
                <span className="text-sm font-medium text-dark-slate">
                    {formatCurrency(Number(deal.value))}
                </span>
            ),
        },
        {
            key: "type",
            header: "Tipo",
            sortable: true,
            filterable: true,
            filterOptions: Object.entries(dealTypeConfig).map(([value, { label }]) => ({
                value,
                label,
            })),
            hideable: true,
            defaultVisible: true,
            render: (deal) => (
                <span className="text-sm text-dark-slate">
                    {deal.type ? dealTypeConfig[deal.type].label : "-"}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            sortable: true,
            filterable: true,
            filterOptions: Object.entries(dealStatusConfig).map(([value, { label }]) => ({
                value,
                label,
            })),
            hideable: true,
            defaultVisible: true,
            render: (deal) => {
                const config = dealStatusConfig[deal.status];
                return (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
                        {config.label}
                    </span>
                );
            },
        },
        {
            key: "createdAt",
            header: "Fecha",
            sortable: true,
            hideable: true,
            defaultVisible: false,
            render: (deal) => (
                <span className="text-sm text-gray-500">
                    {new Date(deal.createdAt).toLocaleDateString('es-ES')}
                </span>
            ),
        },
    ];

    const handleSavePreferences = async (prefs: TablePreferences) => {
        await saveTablePreferences("deals", prefs);
    };

    if (deals.length === 0) {
        return (
            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden">
                <div className="text-center py-8 sm:py-12 px-4">
                    <p className="text-dark-slate text-base sm:text-lg">No hay negocios registrados</p>
                    <Link
                        href="/app/deals/new"
                        className="inline-flex items-center px-4 py-2 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900"
                    >
                        <Plus size={16} className="mr-2" />
                        Agregar primer negocio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <DataTable
                    data={deals}
                    columns={columns}
                    keyExtractor={(deal) => deal.id}
                    onRowClick={(deal) => router.push(`/app/deals/${deal.id}`)}
                    searchable
                    searchPlaceholder="Buscar negocios..."
                    searchKeys={["name"]}
                    initialPreferences={initialPreferences || undefined}
                    onSavePreferences={handleSavePreferences}
                />
            </div>

            {/* Mobile Card View - Optimizado para iOS */}
            <div className="md:hidden bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden divide-y divide-graphite-gray">
                {deals.map((deal) => {
                    const formatCurrencyShort = (value: number) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return formatCurrency(value);
                    };

                    return (
                        <Link
                            key={deal.id}
                            href={`/app/deals/${deal.id}`}
                            className="block p-3 sm:p-4 hover:bg-soft-gray active:bg-gray-100 transition-colors touch-manipulation"
                        >
                            <div className="flex items-start gap-3">
                                {/* Value Badge */}
                                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-nearby-accent/10 to-nearby-accent/5 flex flex-col items-center justify-center border border-nearby-accent/20">
                                    <span className="text-[10px] text-nearby-accent font-medium">VALOR</span>
                                    <span className="text-sm font-bold text-nearby-dark">
                                        {formatCurrencyShort(Number(deal.value))}
                                    </span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-nearby-dark truncate">
                                            {deal.name}
                                        </h3>
                                        <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${dealStatusConfig[deal.status].color}`}>
                                            {dealStatusConfig[deal.status].label}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-0.5 text-xs text-gray-600">
                                        {deal.company && (
                                            <p className="truncate">
                                                <span className="text-gray-500">Empresa:</span> {deal.company.name}
                                            </p>
                                        )}
                                        {deal.contact && (
                                            <p className="truncate">
                                                <span className="text-gray-500">Contacto:</span> {deal.contact.fullName}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                        <span className="text-[10px] text-gray-500">
                                            {deal.type ? dealTypeConfig[deal.type].label : "—"}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(deal.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </>
    );
}

export function DealsClientPage({ deals: initialDeals, defaultView = "table", initialTablePreferences }: DealsClientPageProps) {
    const [viewMode, setViewMode] = useState<"table" | "kanban">(defaultView);
    const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals);
    const [activeDeal, setActiveDeal] = useState<DealWithRelations | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Permite clicks normales, solo activa drag después de 8px
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200, // Delay para diferenciar scroll de drag en móvil
                tolerance: 5,
            },
        })
    );

    const dealsByStatus = kanbanColumns.reduce((acc, status) => {
        acc[status] = deals.filter(deal => deal.status === status);
        return acc;
    }, {} as Record<string, DealWithRelations[]>);

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
                        <h1 className="text-2xl sm:text-3xl font-bold text-nearby-dark">Negocios</h1>
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
                                        ? "bg-nearby-dark text-white border-nearby-dark"
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
                                        ? "bg-nearby-dark text-white border-nearby-dark"
                                        : "bg-white text-dark-slate border-graphite-gray hover:bg-gray-50"
                                } rounded-r-md transition-colors`}
                            >
                                <LayoutGrid size={16} className="sm:mr-2" />
                                <span className="hidden sm:inline">Kanban</span>
                            </button>
                        </div>

                        <Link
                            href="/app/deals/new"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                        >
                            <Plus size={20} className="mr-2" />
                            <span className="hidden sm:inline">Nuevo Negocio</span>
                            <span className="sm:hidden">Nuevo</span>
                        </Link>
                    </div>
                </div>

                {/* Table View */}
                {viewMode === "table" && (
                    <DealsTable deals={deals} initialPreferences={initialTablePreferences} />
                )}

                {/* Kanban View - Optimizado para móvil */}
                {viewMode === "kanban" && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Instrucción para móvil */}
                        <div className="md:hidden mb-3">
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14"/>
                                    <path d="m12 5 7 7-7 7"/>
                                </svg>
                                Desliza horizontalmente • Mantén presionado para mover
                            </p>
                        </div>
                        
                        <div 
                            className="overflow-x-auto pb-4 scrollbar-thin"
                            style={{ 
                                WebkitOverflowScrolling: 'touch',
                                scrollbarWidth: 'thin',
                            }}
                        >
                            <div className="flex gap-3 sm:gap-4 w-max">
                                {kanbanColumns.map((status) => (
                                    <KanbanColumn
                                        key={status}
                                        status={status as DealStatus}
                                        deals={dealsByStatus[status] || []}
                                    />
                                ))}
                                {/* Spacer al final para padding derecho */}
                                <div className="w-1 flex-shrink-0" />
                            </div>
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay dropAnimation={{
                            duration: 200,
                            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                        }}>
                            {activeDeal && <DealCard deal={activeDeal} isDragging />}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
