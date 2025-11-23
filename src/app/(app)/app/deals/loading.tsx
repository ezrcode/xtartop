export default function Loading() {
    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>

                {/* Content Skeleton - Kanban style */}
                <div className="overflow-x-auto pb-4">
                    <div className="inline-flex space-x-4 min-w-full">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-80">
                                <div className="bg-white rounded-lg border border-graphite-gray shadow-sm">
                                    <div className="px-4 py-3 border-b border-graphite-gray">
                                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {[...Array(3)].map((_, j) => (
                                            <div key={j} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                                                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                                                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                                                <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
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

