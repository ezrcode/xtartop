"use client";

import { useState, useEffect, memo } from "react";
import { Loader2 } from "lucide-react";
import { getActivities } from "@/actions/email";
import { CompanyActivitiesSection } from "./company-activities-section";
import type { Contact, Activity, User } from "@prisma/client";

type ActivityWithUser = Activity & {
    createdBy: Pick<User, 'name' | 'email' | 'photoUrl'>;
};

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

interface Props {
    companyId: string;
    defaultEmail?: string;
    clientInvitations: ClientInvitationData[];
    contractStatus: ContractStatus;
    companyContacts: Contact[];
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

// Client component that loads activities once on mount
function CompanyActivitiesClientInner({
    companyId,
    defaultEmail = "",
    clientInvitations,
    contractStatus,
    companyContacts,
}: Props) {
    const [activities, setActivities] = useState<ActivityWithUser[] | null>(null);
    const [loading, setLoading] = useState(true);

    // Load activities only once on mount
    useEffect(() => {
        let mounted = true;
        
        async function loadActivities() {
            try {
                const data = await getActivities("company", companyId);
                if (mounted) {
                    setActivities(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading activities:", error);
                if (mounted) {
                    setActivities([]);
                    setLoading(false);
                }
            }
        }

        loadActivities();

        return () => {
            mounted = false;
        };
    }, [companyId]); // Only reload if companyId changes

    if (loading || activities === null) {
        return <ActivitiesSkeleton />;
    }

    return (
        <CompanyActivitiesSection
            activities={activities}
            companyId={companyId}
            defaultEmail={defaultEmail}
            clientInvitations={clientInvitations}
            contractStatus={contractStatus}
            companyContacts={companyContacts}
        />
    );
}

// Memoized version to prevent re-renders from parent state changes
export const CompanyActivitiesClient = memo(CompanyActivitiesClientInner, (prevProps, nextProps) => {
    // Only re-render if companyId changes
    // Other props changes (like clientInvitations) don't require re-fetching activities
    return prevProps.companyId === nextProps.companyId;
});
