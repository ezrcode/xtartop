import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-soft-gray">
            <Sidebar />
            <main className="flex-1 md:ml-20 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
