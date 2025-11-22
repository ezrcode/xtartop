import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-soft-gray">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center text-3xl font-bold text-xtartop-black">
                    xtartop
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-dark-slate">
                    Log in to your account
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
