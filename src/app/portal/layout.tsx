import Image from "next/image";
import Link from "next/link";

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-soft-gray">
            <header className="bg-white border-b border-graphite-gray">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/portal">
                        <Image
                            src="/nearby_logo.png"
                            alt="NEARBY"
                            width={120}
                            height={32}
                            className="h-8 w-auto"
                        />
                    </Link>
                    <span className="text-sm text-dark-slate">Portal de Clientes</span>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
