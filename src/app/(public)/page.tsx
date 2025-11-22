import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white text-xtartop-black font-sans">
            <header className="flex items-center justify-between px-6 py-4 border-b border-soft-gray">
                <Link href="/" className="flex items-center">
                    <Image 
                        src="/xtartop_logo.png" 
                        alt="xtartop" 
                        width={150} 
                        height={40}
                        className="h-8 w-auto"
                    />
                </Link>
                <div className="space-x-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-dark-slate hover:text-xtartop-black transition-colors"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="px-4 py-2 text-sm font-medium text-white bg-xtartop-black rounded-md hover:bg-gray-900 transition-colors"
                    >
                        Sign up
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                    The OS for <span className="text-founder-blue">Early Founders</span>
                </h1>
                <p className="text-xl md:text-2xl text-dark-slate max-w-2xl mb-10">
                    Manage your startup from idea to exit. All the tools you need, none of the fluff.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/signup"
                        className="px-8 py-4 text-lg font-semibold text-white bg-xtartop-black rounded-lg hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl"
                    >
                        Get Started for Free
                    </Link>
                    <Link
                        href="/login"
                        className="px-8 py-4 text-lg font-semibold text-xtartop-black bg-soft-gray rounded-lg hover:bg-graphite-gray transition-all"
                    >
                        Log In
                    </Link>
                </div>
            </main>

            <footer className="py-8 text-center text-dark-slate text-sm border-t border-soft-gray">
                &copy; {new Date().getFullYear()} xtartop. All rights reserved.
            </footer>
        </div>
    );
}
