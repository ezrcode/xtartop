import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
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
                    Iniciar sesión
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
