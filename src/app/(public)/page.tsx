import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white text-nearby-dark font-sans">
            <header className="flex items-center justify-between px-6 py-4 border-b border-soft-gray">
                <Link href="/" className="flex items-center">
                    <Image 
                        src="/nearby_logo.png" 
                        alt="NEARBY" 
                        width={150} 
                        height={40}
                        className="h-8 w-auto"
                    />
                </Link>
                <div className="space-x-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-dark-slate hover:text-nearby-dark transition-colors"
                    >
                        Iniciar sesión
                    </Link>
                    <Link
                        href="/signup"
                        className="px-4 py-2 text-sm font-medium text-white bg-nearby-dark rounded-md hover:bg-nearby-accent transition-colors"
                    >
                        Registrarse
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                    <span className="text-nearby-accent">NEARBY</span> CRM
                </h1>
                <p className="text-xl md:text-2xl text-dark-slate max-w-2xl mb-10">
                    Gestiona tus relaciones con clientes de manera simple y efectiva.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/login"
                        className="px-8 py-4 text-lg font-semibold text-white bg-nearby-dark rounded-lg hover:bg-nearby-accent transition-all shadow-lg hover:shadow-xl"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </main>

            <footer className="py-8 text-center text-dark-slate text-sm border-t border-soft-gray">
                &copy; {new Date().getFullYear()} NEARBY. Todos los derechos reservados.
            </footer>
        </div>
    );
}
