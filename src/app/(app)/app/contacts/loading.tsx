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
                    <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Table Skeleton */}
                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden">
                    <div className="px-6 py-4 border-b border-graphite-gray">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="divide-y divide-gray-200">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center space-x-4">
                                <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

