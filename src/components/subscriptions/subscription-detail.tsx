"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { SubscriptionBillingSection } from "@/components/companies/subscription-billing-section";
import { BillingHistoryTab } from "@/components/companies/billing-history-tab";
import { InvoicesTab } from "@/components/companies/invoices-tab";
import { AdmCloudLinksSection } from "@/components/companies/admcloud-links-section";

interface SubscriptionDetailProps {
    companyId: string;
    companyName: string;
    taxId: string | null;
    admCloudRelationshipId: string | null;
    admCloudLastSync: Date | null;
}

type Section = "billing" | "proformas" | "invoices";

export function SubscriptionDetail({
    companyId,
    companyName,
    taxId,
    admCloudRelationshipId,
    admCloudLastSync,
}: SubscriptionDetailProps) {
    const [section, setSection] = useState<Section>("billing");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/app/subscriptions"
                    className="flex items-center justify-center w-9 h-9 rounded-md border border-[var(--card-border)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-[var(--foreground)] truncate">{companyName}</h1>
                    <Link
                        href={`/app/companies/${companyId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <Building2 size={12} />
                        Ver ficha de empresa
                    </Link>
                </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 p-1 bg-[var(--hover-bg)] rounded-lg w-fit">
                {([
                    { key: "billing" as Section, label: "Cobro Mensual" },
                    { key: "proformas" as Section, label: "Proformas" },
                    { key: "invoices" as Section, label: "Facturas" },
                ]).map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSection(tab.key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            section === tab.key
                                ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {section === "billing" && (
                <SubscriptionBillingSection companyId={companyId} />
            )}

            {section === "proformas" && (
                <BillingHistoryTab companyId={companyId} />
            )}

            {section === "invoices" && (
                <div className="space-y-4">
                    <AdmCloudLinksSection companyId={companyId} />
                    <InvoicesTab
                        companyId={companyId}
                        companyName={companyName}
                        taxId={taxId}
                        admCloudRelationshipId={admCloudRelationshipId}
                        admCloudLastSync={admCloudLastSync}
                    />
                </div>
            )}
        </div>
    );
}
