import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LogOut, Building2, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { logout } from "@/actions/auth";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function PortalDashboard() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect("/portal/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            contact: {
                include: {
                    company: true,
                },
            },
        },
    });

    if (!user) {
        redirect("/portal/login");
    }

    // If user is not CLIENT type, redirect to internal app
    if (user.userType !== "CLIENT") {
        redirect("/app");
    }

    // If user doesn't have a linked contact/company, show error
    if (!user.contact?.company) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-nearby-dark mb-2">
                        Error de configuración
                    </h1>
                    <p className="text-dark-slate mb-4">
                        Tu cuenta no está vinculada a una empresa. Por favor contacta a NEARBY.
                    </p>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark"
                        >
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const company = user.contact.company;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-nearby-dark">
                        Bienvenido, {user.name || user.contact.fullName}
                    </h1>
                    <p className="text-dark-slate">{company.name}</p>
                </div>
                <form action={logout}>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-dark-slate hover:text-error-red transition-colors"
                    >
                        <LogOut size={18} className="mr-2" />
                        Cerrar sesión
                    </button>
                </form>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-lg border border-graphite-gray p-6">
                <div className="flex items-center space-x-3 mb-4">
                    {company.termsAccepted ? (
                        <>
                            <CheckCircle className="text-success-green" size={24} />
                            <span className="text-lg font-semibold text-success-green">
                                Contrato Aceptado
                            </span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="text-warning-amber" size={24} />
                            <span className="text-lg font-semibold text-warning-amber">
                                Pendiente de Aceptación
                            </span>
                        </>
                    )}
                </div>
                {company.termsAccepted && company.termsAcceptedAt && (
                    <p className="text-sm text-dark-slate">
                        Aceptado por {company.termsAcceptedByName} el{" "}
                        {new Date(company.termsAcceptedAt).toLocaleDateString("es-DO", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                )}
            </div>

            {/* Company Info Card */}
            <div className="bg-white rounded-lg border border-graphite-gray p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <Building2 className="text-nearby-dark" size={24} />
                    <h2 className="text-lg font-semibold text-nearby-dark">
                        Datos de la Empresa
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            Nombre Comercial
                        </label>
                        <p className="text-nearby-dark">{company.name}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            Razón Social
                        </label>
                        <p className="text-nearby-dark">{company.legalName || "—"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            RNC
                        </label>
                        <p className="text-nearby-dark">{company.taxId || "—"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            Dirección Fiscal
                        </label>
                        <p className="text-nearby-dark">{company.fiscalAddress || "—"}</p>
                    </div>
                </div>

                {!company.termsAccepted && (
                    <div className="mt-6 pt-6 border-t border-graphite-gray">
                        <p className="text-sm text-dark-slate mb-4">
                            Complete los datos de su empresa y acepte los términos y condiciones para continuar.
                        </p>
                        <a
                            href={`/portal/company`}
                            className="inline-flex items-center px-4 py-2 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors"
                        >
                            <FileText size={18} className="mr-2" />
                            Completar datos y aceptar contrato
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
