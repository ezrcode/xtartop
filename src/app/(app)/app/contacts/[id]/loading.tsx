export default function Loading() {
    return (
        <div className="flex flex-col h-full">
            {/* Command Bar Skeleton */}
            <div className="sticky top-0 z-10 bg-white border-b border-graphite-gray shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
                            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Skeleton */}
            <div className="flex-1 overflow-y-auto bg-soft-gray">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column - Form */}
                        <div className="lg:col-span-7">
                            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 space-y-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column - Activities */}
                        <div className="lg:col-span-5">
                            <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6 space-y-4">
                                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="border border-graphite-gray rounded-lg p-4 space-y-2">
                                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

