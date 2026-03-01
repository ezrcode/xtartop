"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";

export interface SearchResult {
    id: string;
    type: "company" | "contact" | "deal";
    name: string;
    subtitle?: string;
    href: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const q = query.trim();

    const [companies, contacts, deals] = await Promise.all([
        prisma.company.findMany({
            where: {
                workspaceId: workspace.id,
                name: { contains: q, mode: "insensitive" },
            },
            select: { id: true, name: true, city: true, status: true },
            take: 5,
        }),
        prisma.contact.findMany({
            where: {
                workspaceId: workspace.id,
                OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { id: true, fullName: true, email: true, company: { select: { name: true } } },
            take: 5,
        }),
        prisma.deal.findMany({
            where: {
                workspaceId: workspace.id,
                name: { contains: q, mode: "insensitive" },
            },
            select: { id: true, name: true, status: true, company: { select: { name: true } } },
            take: 5,
        }),
    ]);

    const results: SearchResult[] = [
        ...companies.map((c) => ({
            id: c.id,
            type: "company" as const,
            name: c.name,
            subtitle: [c.city, c.status].filter(Boolean).join(" · "),
            href: `/app/companies/${c.id}`,
        })),
        ...contacts.map((c) => ({
            id: c.id,
            type: "contact" as const,
            name: c.fullName,
            subtitle: [c.email, c.company?.name].filter(Boolean).join(" · "),
            href: `/app/contacts/${c.id}`,
        })),
        ...deals.map((d) => ({
            id: d.id,
            type: "deal" as const,
            name: d.name,
            subtitle: [d.company?.name, d.status].filter(Boolean).join(" · "),
            href: `/app/deals/${d.id}`,
        })),
    ];

    return results;
}
