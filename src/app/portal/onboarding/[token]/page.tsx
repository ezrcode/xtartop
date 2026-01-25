import { getInvitationByToken } from "@/actions/client-invitation";
import { OnboardingForm } from "@/components/portal/onboarding-form";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface OnboardingPageProps {
    params: Promise<{ token: string }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);

    return (
        <div className="min-h-screen bg-soft-gray py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image
                            src="/nearby_logo.png"
                            alt="NEARBY"
                            width={150}
                            height={40}
                            className="h-10 w-auto mx-auto"
                        />
                    </Link>
                    <h1 className="mt-6 text-3xl font-bold text-nearby-dark">
                        Portal de Clientes
                    </h1>
                </div>

                {!invitation ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <AlertCircle className="mx-auto text-error-red mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-nearby-dark mb-2">
                            Invitación no encontrada
                        </h2>
                        <p className="text-dark-slate">
                            El enlace que utilizaste no es válido o ha expirado.
                        </p>
                    </div>
                ) : invitation.status === "EXPIRED" ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <AlertCircle className="mx-auto text-warning-amber mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-nearby-dark mb-2">
                            Invitación expirada
                        </h2>
                        <p className="text-dark-slate">
                            Esta invitación ha expirado. Por favor, contacta a NEARBY para solicitar una nueva.
                        </p>
                    </div>
                ) : invitation.status === "ACCEPTED" ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <CheckCircle className="mx-auto text-success-green mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-nearby-dark mb-2">
                            Ya tienes una cuenta
                        </h2>
                        <p className="text-dark-slate mb-6">
                            Esta invitación ya fue utilizada. Puedes ingresar al portal con tu cuenta.
                        </p>
                        <Link
                            href="/portal/login"
                            className="inline-flex items-center px-6 py-3 bg-nearby-dark text-white rounded-md hover:bg-nearby-accent transition-colors"
                        >
                            Ir al Portal
                        </Link>
                    </div>
                ) : invitation.status === "REVOKED" ? (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <AlertCircle className="mx-auto text-error-red mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-nearby-dark mb-2">
                            Invitación cancelada
                        </h2>
                        <p className="text-dark-slate">
                            Esta invitación ha sido cancelada. Por favor, contacta a NEARBY.
                        </p>
                    </div>
                ) : (
                    <OnboardingForm
                        token={token}
                        company={invitation.company}
                        contact={invitation.contact}
                    />
                )}
            </div>
        </div>
    );
}
