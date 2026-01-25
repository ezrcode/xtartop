"use server";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const INTERNAL_DOMAIN = "nearbycrm.com";
const SECRET_KEY = process.env.AUTH_SECRET || "fix-users-secret";

export async function POST(request: Request) {
    // Simple auth check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${SECRET_KEY}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find all users with @nearbycrm.com domain
        const users = await prisma.user.findMany({
            where: {
                email: {
                    endsWith: `@${INTERNAL_DOMAIN}`,
                },
            },
        });

        const updates = [];
        for (const user of users) {
            if (user.userType !== "INTERNAL") {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { 
                        userType: "INTERNAL",
                        contactId: null, // Remove any client contact link
                    },
                });
                updates.push({
                    email: user.email,
                    previousType: user.userType,
                    newType: "INTERNAL",
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updates.length} users to INTERNAL`,
            updates,
        });
    } catch (error) {
        console.error("Error fixing user types:", error);
        return NextResponse.json(
            { error: "Failed to fix user types" },
            { status: 500 }
        );
    }
}
