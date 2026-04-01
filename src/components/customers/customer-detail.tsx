"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    Building2,
    FileText,
    Ticket,
    Download,
    Loader2,
    FolderOpen,
    Users as UsersIcon,
    ExternalLink,
} from "lucide-react";
import { Company, Contact, ClientInvitation, Project, ClientUser } from "@prisma/client";
import { CompanyActivitiesClient } from "@/components/activities/company-activities-client";
import { ProjectsTable } from "@/components/companies/projects-table";
import { ClientUsersTable } from "@/components/companies/client-users-table";
import { TicketsTab } from "@/components/companies/tickets-tab";

type CompanyWithRelations = Company & {
    workspace: {
        name: string;
        legalName: string | null;
        contractTemplate: string | null;
        contractVersion: string | null;
    } | null;
    primaryContact?: Contact | null;
    contacts: Contact[];
    clientInvitations?: (ClientInvitation & { contact: Contact })[];
    projects?: Project[];
    clientUsers?: ClientUser[];
};

interface CustomerDetailProps {
    company: CompanyWithRelations;
    contacts: Contact[];
    userRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;
}

type Tab = "general" | "contract" | "tickets";

export function CustomerDetail({ company, contacts, userRole }: CustomerDetailProps) {
    const [activeTab, setActiveTab] = useState<Tab>("general");

    const memoizedClientInvitations = useMemo(() => {
        return company.clientInvitations?.map((inv) => ({
            id: inv.id,
            contactId: inv.contactId,
            status: inv.status,
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
            contact: {
                fullName: inv.contact.fullName,
                email: inv.contact.email,
            },
        })) || [];
    }, [company.clientInvitations]);

    const memoizedContractStatus = useMemo(() => ({
        termsAccepted: company.termsAccepted || false,
        termsAcceptedAt: company.termsAcceptedAt || null,
        termsAcceptedByName: company.termsAcceptedByName || null,
        termsVersion: company.termsVersion || null,
    }), [company.termsAccepted, company.termsAcceptedAt, company.termsAcceptedByName, company.termsVersion]);

    const memoizedCompanyContacts = useMemo(() => {
        return contacts.filter((c) => c.companyId === company.id);
    }, [contacts, company.id]);

    const acceptanceDateTime = company.termsAcceptedAt
        ? new Date(company.termsAcceptedAt).toLocaleString("es-DO", {
            dateStyle: "long",
            timeStyle: "short",
        })
        : null;

    const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
        { key: "general", label: "General", icon: Building2 },
        { key: "contract", label: "Contrato", icon: FileText },
        { key: "tickets", label: "Tickets", icon: Ticket },
    ];

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/app/customers"
                        className="flex items-center justify-center w-9 h-9 rounded-md border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {company.logoUrl ? (
                            <div className="w-10 h-10 rounded-lg border border-[var(--card-border)] overflow-hidden flex-shrink-0">
                                <Image src={company.logoUrl} alt={company.name} width={40} height={40} className="object-contain" />
                            </div>
                        ) : null}
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-[var(--foreground)] truncate">{company.name}</h1>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/app/companies/${company.id}`}
                                    className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors"
                                >
                                    <ExternalLink size={11} />
                                    Ficha completa
                                </Link>
                                {company.taxId && (
                                    <span className="text-xs font-mono text-[var(--muted-text)]">RNC: {company.taxId}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                    {/* Left Column: Content */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Tabs */}
                        <div className="border-b border-[var(--card-border)]">
                            <nav className="flex justify-between sm:justify-start sm:gap-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                                            activeTab === tab.key
                                                ? "border-nearby-dark/50 text-[var(--foreground)]"
                                                : "border-transparent text-[var(--muted-text)] hover:text-[var(--foreground)]"
                                        }`}
                                    >
                                        <tab.icon size={16} className="shrink-0" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-4 sm:p-6">
                            {/* General */}
                            {activeTab === "general" && (
                                <div className="space-y-6">
                                    {/* Company info */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Información General</h3>
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InfoField label="Nombre" value={company.name} />
                                            <InfoField label="RNC" value={company.taxId} mono />
                                            <InfoField label="Teléfono" value={company.phone} />
                                            <InfoField label="País" value={company.country} />
                                            <InfoField label="Ciudad" value={company.city} />
                                            <InfoField label="Contacto Principal" value={company.primaryContact?.fullName} />
                                            {company.website && (
                                                <div className="sm:col-span-2">
                                                    <dt className="text-xs text-[var(--muted-text)] mb-0.5">Sitio web</dt>
                                                    <dd>
                                                        <a
                                                            href={company.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-[var(--foreground)] hover:underline"
                                                        >
                                                            {company.website}
                                                        </a>
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>

                                    {/* Projects */}
                                    <div className="border-t border-[var(--card-border)] pt-6">
                                        <ProjectsTable
                                            companyId={company.id}
                                            projects={company.projects || []}
                                        />
                                    </div>

                                    {/* Users */}
                                    <div className="border-t border-[var(--card-border)] pt-6">
                                        <ClientUsersTable
                                            companyId={company.id}
                                            clientUsers={company.clientUsers || []}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Contract */}
                            {activeTab === "contract" && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Datos del Contrato</h3>
                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InfoField label="Razón Social" value={company.legalName} />
                                            <InfoField label="RNC" value={company.taxId} mono />
                                            <div className="sm:col-span-2">
                                                <InfoField label="Dirección Fiscal" value={company.fiscalAddress} />
                                            </div>
                                            <InfoField label="Id. Cotización" value={company.quoteId} />
                                            <InfoField label="Proyectos Iniciales" value={company.initialProjects?.toString()} />
                                            <InfoField label="Usuarios Iniciales" value={company.initialUsers?.toString()} />
                                        </dl>
                                    </div>

                                    {company.quoteFileUrl && (
                                        <div>
                                            <a
                                                href={company.quoteFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-nearby-dark rounded-md hover:bg-nearby-dark-600 transition-colors"
                                            >
                                                <Download size={14} />
                                                Descargar cotización
                                            </a>
                                        </div>
                                    )}

                                    {company.termsAccepted && (
                                        <div className="rounded-lg border border-nearby-dark/30 bg-nearby-dark/8 dark:bg-nearby-dark-300/10 p-4 space-y-2">
                                            <h4 className="text-sm font-semibold text-[var(--foreground)]">
                                                Acuerdo firmado por el cliente
                                            </h4>
                                            <p className="text-xs text-[var(--foreground)]">
                                                Fecha/Hora: <strong>{acceptanceDateTime || "—"}</strong>
                                            </p>
                                            <p className="text-xs text-[var(--foreground)]">
                                                Nombre: <strong>{company.termsAcceptedByName || "—"}</strong>
                                            </p>
                                            {company.termsVersion && (
                                                <p className="text-xs text-[var(--muted-text)]">
                                                    Versión: {company.termsVersion}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {!company.termsAccepted && (
                                        <div className="rounded-lg border border-dashed border-[var(--card-border)] p-4">
                                            <p className="text-sm text-[var(--muted-text)]">
                                                El contrato aún no ha sido firmado por el cliente.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tickets */}
                            {activeTab === "tickets" && (
                                <TicketsTab
                                    companyId={company.id}
                                    companyName={company.name}
                                    clickUpClientName={company.clickUpClientName || null}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Column: Activities */}
                    <div className="lg:col-span-5 flex flex-col min-h-0 lg:sticky lg:top-24 self-start">
                        <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-4 sm:p-6 flex flex-col h-[420px] sm:h-[500px] lg:h-[calc(100vh-150px)] lg:max-h-[calc(100vh-150px)] overflow-hidden">
                            <CompanyActivitiesClient
                                companyId={company.id}
                                defaultEmail={company.primaryContact?.email || ""}
                                clientInvitations={memoizedClientInvitations}
                                contractStatus={memoizedContractStatus}
                                companyContacts={memoizedCompanyContacts}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <dt className="text-xs text-[var(--muted-text)] mb-0.5">{label}</dt>
            <dd className={`text-sm text-[var(--foreground)] ${mono ? "font-mono tabular-nums" : ""}`}>
                {value || <span className="text-[var(--muted-text)] italic">—</span>}
            </dd>
        </div>
    );
}
