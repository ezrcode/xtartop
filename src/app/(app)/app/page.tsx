import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/logout-button";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            workspaces: {
                include: {
                    subscription: true,
                },
            },
        },
    });

    if (!user) {
        // Handle edge case where session exists but user is gone
        redirect("/login");
    }

    const workspace = user.workspaces[0]; // Assuming 1 workspace for now
    const subscription = workspace?.subscription;

    return (
        <div className="min-h-screen bg-soft-gray">
            <nav className="bg-white shadow-sm border-b border-graphite-gray">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 text-xl font-bold text-xtartop-black">
                                xtartop
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <span className="border-founder-blue text-xtartop-black inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    Dashboard
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <LogoutButton />
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <h1 className="text-3xl font-bold text-xtartop-black">
                            Welcome back, {user.name}
                        </h1>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Workspace Card */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-dark-slate truncate">
                                    Workspace
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-xtartop-black">
                                    {workspace?.name || "No Workspace"}
                                </dd>
                            </div>
                        </div>

                        {/* Subscription Card */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <dt className="text-sm font-medium text-dark-slate truncate">
                                    Current Plan
                                </dt>
                                <dd className="mt-1 text-3xl font-semibold text-xtartop-black">
                                    {subscription?.plan || "None"}
                                </dd>
                                <div className="mt-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subscription?.status === 'ACTIVE' ? 'bg-success-green/10 text-success-green' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {subscription?.status || "Inactive"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
