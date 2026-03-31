export default function Loading() {
    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="h-8 w-48 skeleton rounded-lg animate-pulse" />
                        <div className="h-4 w-64 skeleton rounded-lg animate-pulse" />
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-24 skeleton rounded-lg animate-pulse" />
                        <div className="h-10 w-32 skeleton rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Content Skeleton - Kanban style */}
                <div className="overflow-x-auto pb-4">
                    <div className="inline-flex space-x-4 min-w-full">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-80">
                                <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] shadow-sm">
                                    <div className="px-4 py-3 border-b border-[var(--card-border)]">
                                        <div className="h-4 w-32 skeleton rounded-lg animate-pulse" />
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {[...Array(3)].map((_, j) => (
                                            <div key={j} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 space-y-2">
                                                <div className="h-4 w-3/4 skeleton rounded-lg animate-pulse" />
                                                <div className="h-3 w-1/2 skeleton rounded-lg animate-pulse" />
                                                <div className="h-3 w-2/3 skeleton rounded-lg animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

