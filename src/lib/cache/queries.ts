import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Cached function to get user by email
 * Used in layout and multiple pages
 */
export const getCachedUser = cache(async (email: string) => {
    return await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            dealsViewPref: true,
            themePreference: true,
        },
    });
});

/**
 * Cached function to get user with workspace role
 * Used in layout
 */
export const getCachedUserWithRole = cache(async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            ownedWorkspaces: {
                select: { id: true }
            },
            memberships: {
                select: {
                    role: true,
                    workspaceId: true,
                }
            }
        },
    });

    if (!user) return null;

    // If user owns a workspace, they are OWNER
    if (user.ownedWorkspaces.length > 0) {
        return { 
            role: 'OWNER' as const, 
            workspaceId: user.ownedWorkspaces[0].id,
            user: {
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                themePreference: user.themePreference,
            }
        };
    }

    // Otherwise, check if they are a member of a workspace
    if (user.memberships.length > 0) {
        const membership = user.memberships[0];
        return { 
            role: membership.role, 
            workspaceId: membership.workspaceId,
            user: {
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                themePreference: user.themePreference,
            }
        };
    }

    return null;
});

