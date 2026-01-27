import Link from "next/link";
import { acceptInvitation } from "@/actions/workspace";

interface InvitationPageProps {
    params: { token: string };
}

export default async function InvitationAcceptPage({ params }: InvitationPageProps) {
    const result = await acceptInvitation(params.token);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
            <div className="max-w-md w-full bg-white border border-graphite-gray rounded-lg p-6 text-center space-y-3">
                <h1 className="text-lg font-semibold text-dark-slate">
                    Invitación de equipo interno
                </h1>
                <p className={`text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                    {result.message}
                </p>
                <Link
                    href={result.success ? "/app" : "/login"}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-nearby-accent text-white hover:bg-nearby-dark"
                >
                    {result.success ? "Ir al dashboard" : "Iniciar sesión"}
                </Link>
            </div>
        </div>
    );
}
