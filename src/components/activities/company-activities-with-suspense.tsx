import { Suspense } from "react";
import { getActivities } from "@/actions/email";
import { CompanyActivitiesSection } from "./company-activities-section";
import type { Contact } from "@prisma/client";

interface ClientInvitationData {
    id: string;
    contactId: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
    contact: { fullName: string; email: string };
}

interface ContractStatus {
    termsAccepted: boolean;
    termsAcceptedAt: Date | null;
    termsAcceptedByName: string | null;
    termsVersion: string | null;
}

// Loading skeleton for activities
function ActivitiesSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border border-graphite-gray rounded-lg p-4 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Server component that fetches activities
async function CompanyActivitiesData({
    companyId,
    defaultEmail,
    clientInvitations,
    contractStatus,
    companyContacts,
}: {
    companyId: string;
    defaultEmail?: string;
    clientInvitations: ClientInvitationData[];
    contractStatus: ContractStatus;
    companyContacts: Contact[];
}) {
    const activities = await getActivities("company", companyId);

    return (
        <CompanyActivitiesSection
            activities={activities}
            companyId={companyId}
            defaultEmail={defaultEmail || ""}
            clientInvitations={clientInvitations}
            contractStatus={contractStatus}
            companyContacts={companyContacts}
        />
    );
}

// Wrapper component with Suspense
export function CompanyActivitiesWithSuspense({
    companyId,
    defaultEmail,
    clientInvitations,
    contractStatus,
    companyContacts,
}: {
    companyId: string;
    defaultEmail?: string;
    clientInvitations: ClientInvitationData[];
    contractStatus: ContractStatus;
    companyContacts: Contact[];
}) {
    return (
        <Suspense fallback={<ActivitiesSkeleton />}>
            <CompanyActivitiesData
                companyId={companyId}
                defaultEmail={defaultEmail}
                clientInvitations={clientInvitations}
                contractStatus={contractStatus}
                companyContacts={companyContacts}
            />
        </Suspense>
    );
}
