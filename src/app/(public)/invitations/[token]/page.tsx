import { prisma } from "@/lib/prisma";
import { InvitationAcceptForm } from "@/components/auth/invitation-accept-form";

interface InvitationPageProps {
    params: { token: string };
}

export default async function InvitationAcceptPage({ params }: InvitationPageProps) {
    const invitation = await prisma.invitation.findUnique({
        where: { token: params.token },
    });

    if (!invitation) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
                <div className="max-w-md w-full bg-white border border-graphite-gray rounded-lg p-6 text-center space-y-3">
                    <h1 className="text-lg font-semibold text-dark-slate">Invitación no encontrada</h1>
                    <p className="text-sm text-red-700">El enlace no es válido.</p>
                </div>
            </div>
        );
    }

    if (invitation.status !== "PENDING") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
                <div className="max-w-md w-full bg-white border border-graphite-gray rounded-lg p-6 text-center space-y-3">
                    <h1 className="text-lg font-semibold text-dark-slate">Invitación no disponible</h1>
                    <p className="text-sm text-red-700">Esta invitación ya fue utilizada o revocada.</p>
                </div>
            </div>
        );
    }

    if (invitation.expiresAt < new Date()) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
                <div className="max-w-md w-full bg-white border border-graphite-gray rounded-lg p-6 text-center space-y-3">
                    <h1 className="text-lg font-semibold text-dark-slate">Invitación expirada</h1>
                    <p className="text-sm text-red-700">Este enlace ya no es válido.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-soft-gray">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h1 className="text-2xl font-bold text-dark-slate">Completa tu acceso</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Crea tu contraseña para activar la invitación interna.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <InvitationAcceptForm email={invitation.email} token={invitation.token} />
                </div>
            </div>
        </div>
    );
}
