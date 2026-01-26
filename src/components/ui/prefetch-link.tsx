"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface PrefetchLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
    prefetchOnHover?: boolean;
    prefetchOnVisible?: boolean;
}

export function PrefetchLink({
    href,
    children,
    className = "",
    prefetchOnHover = true,
    prefetchOnVisible = false,
}: PrefetchLinkProps) {
    const router = useRouter();
    const ref = useRef<HTMLAnchorElement>(null);
    const [hasPrefetched, setHasPrefetched] = useState(false);

    const prefetch = useCallback(() => {
        if (hasPrefetched) return;
        router.prefetch(href);
        setHasPrefetched(true);
    }, [href, router, hasPrefetched]);

    // Prefetch on visibility
    useEffect(() => {
        if (!prefetchOnVisible || hasPrefetched) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        prefetch();
                        observer.disconnect();
                    }
                });
            },
            { rootMargin: "100px" }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [prefetchOnVisible, prefetch, hasPrefetched]);

    return (
        <Link
            ref={ref}
            href={href}
            className={className}
            onMouseEnter={prefetchOnHover ? prefetch : undefined}
            onFocus={prefetchOnHover ? prefetch : undefined}
        >
            {children}
        </Link>
    );
}
