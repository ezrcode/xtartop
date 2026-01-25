import Image from "next/image";
import Link from "next/link";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-soft-gray">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center">
                    <Image
                        src="/nearby_logo.png"
                        alt="NEARBY"
                        width={200}
                        height={50}
                        className="h-12 w-auto"
                    />
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-dark-slate">
                    Portal de Clientes
                </h2>
                <p className="mt-2 text-center text-sm text-dark-slate">
                    Ingresa con tu cuenta de cliente
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <PortalLoginForm />
                </div>
            </div>
        </div>
    );
}
