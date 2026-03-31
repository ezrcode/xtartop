export default function Loading() {
    return (
        <div className="flex flex-col h-full">
            {/* Command Bar Skeleton */}
            <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-[var(--card-border)] shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="h-8 w-8 skeleton rounded-full animate-pulse" />
                            <div className="h-6 w-48 skeleton rounded-lg animate-pulse" />
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-24 skeleton rounded-lg animate-pulse" />
                            <div className="h-10 w-32 skeleton rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Skeleton */}
            <div className="flex-1 overflow-y-auto bg-[var(--surface-0)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column - Form */}
                        <div className="lg:col-span-7">
                            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-6 space-y-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-4 w-24 skeleton rounded-lg animate-pulse" />
                                        <div className="h-10 w-full skeleton rounded-lg animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column - Activities */}
                        <div className="lg:col-span-5">
                            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-6 space-y-4">
                                <div className="h-6 w-32 skeleton rounded-lg animate-pulse" />
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="border border-[var(--card-border)] rounded-lg p-4 space-y-2">
                                        <div className="h-4 w-3/4 skeleton rounded-lg animate-pulse" />
                                        <div className="h-3 w-1/2 skeleton rounded-lg animate-pulse" />
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

