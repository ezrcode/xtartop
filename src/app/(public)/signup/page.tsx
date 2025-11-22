import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-soft-gray">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center text-3xl font-bold text-xtartop-black">
                    xtartop
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-dark-slate">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-dark-slate">
                    Start managing your startup today.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <SignupForm />
                </div>
            </div>
        </div>
    );
}
