import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCachedUserWithRole, getCachedLatestExchangeRate } from "@/lib/cache/queries";
import { getContacts } from "@/actions/contacts";
import { getTablePreferences } from "@/actions/table-preferences";
import { getUserItemsPerPage } from "@/actions/profile";

export async function GET() {
    const steps: { step: string; status: string; data?: unknown; error?: string }[] = [];

    try {
        steps.push({ step: "auth", status: "starting" });
        const session = await auth();
        steps.push({ step: "auth", status: "ok", data: { email: session?.user?.email } });

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Not authenticated", steps });
        }

        steps.push({ step: "getCachedUserWithRole", status: "starting" });
        const userWithRole = await getCachedUserWithRole(session.user.email);
        steps.push({
            step: "getCachedUserWithRole",
            status: "ok",
            data: {
                role: userWithRole?.role,
                workspaceId: userWithRole?.workspaceId,
                userKeys: userWithRole?.user ? Object.keys(userWithRole.user) : null,
            },
        });

        if (userWithRole?.workspaceId) {
            steps.push({ step: "getCachedLatestExchangeRate", status: "starting" });
            const rate = await getCachedLatestExchangeRate(userWithRole.workspaceId);
            steps.push({
                step: "getCachedLatestExchangeRate",
                status: "ok",
                data: { rate: rate ? Number(rate.rate) : null },
            });
        }

        steps.push({ step: "getContacts", status: "starting" });
        const contacts = await getContacts();
        steps.push({ step: "getContacts", status: "ok", data: { count: contacts.length } });

        if (contacts.length > 0) {
            const sample = contacts[0];
            steps.push({
                step: "contactSample",
                status: "ok",
                data: {
                    keys: Object.keys(sample),
                    types: Object.fromEntries(
                        Object.entries(sample).map(([k, v]) => [
                            k,
                            v === null ? "null" : typeof v === "object" ? v.constructor?.name || "object" : typeof v,
                        ])
                    ),
                },
            });
        }

        steps.push({ step: "getTablePreferences", status: "starting" });
        const prefs = await getTablePreferences("contacts");
        steps.push({ step: "getTablePreferences", status: "ok", data: { prefs } });

        steps.push({ step: "getUserItemsPerPage", status: "starting" });
        const ipp = await getUserItemsPerPage();
        steps.push({ step: "getUserItemsPerPage", status: "ok", data: { itemsPerPage: ipp } });

        return NextResponse.json({ success: true, steps });
    } catch (error: unknown) {
        const err = error as Error;
        steps.push({
            step: "CRASH",
            status: "error",
            error: err.message,
            data: { stack: err.stack?.split("\n").slice(0, 5) },
        });
        return NextResponse.json({ success: false, steps }, { status: 500 });
    }
}
