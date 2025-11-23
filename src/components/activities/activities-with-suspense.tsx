import { Suspense } from "react";
import { getActivities } from "@/actions/email";
import { ActivitiesSection } from "../activities/activities-section";

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
async function ActivitiesData({
    entityType,
    entityId,
    defaultEmail,
}: {
    entityType: "company" | "contact" | "deal";
    entityId: string;
    defaultEmail?: string;
}) {
    const activities = await getActivities(entityType, entityId);

    return (
        <ActivitiesSection
            activities={activities}
            entityType={entityType}
            entityId={entityId}
            defaultEmail={defaultEmail || ""}
        />
    );
}

// Wrapper component with Suspense
export function ActivitiesWithSuspense({
    entityType,
    entityId,
    defaultEmail,
}: {
    entityType: "company" | "contact" | "deal";
    entityId: string;
    defaultEmail?: string;
}) {
    return (
        <Suspense fallback={<ActivitiesSkeleton />}>
            <ActivitiesData
                entityType={entityType}
                entityId={entityId}
                defaultEmail={defaultEmail}
            />
        </Suspense>
    );
}

