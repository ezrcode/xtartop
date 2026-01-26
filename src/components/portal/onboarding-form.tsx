"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, FileText, CheckCircle } from "lucide-react";
import { registerClientUser, updateCompanyData, acceptTermsAndConditions } from "@/actions/portal-auth";
import { signIn } from "next-auth/react";

interface OnboardingFormProps {
    token: string;
    company: {
        id: string;
        name: string;
        legalName: string | null;
        taxId: string | null;
        fiscalAddress: string | null;
        termsAccepted: boolean;
        initialProjects: number | null;
        initialUsers: number | null;
    };
    contact: {
        id: string;
        fullName: string;
        email: string;
    };
    userExists?: boolean;
    contractTemplate: string;
    providerName: string;
}

type Step = "account" | "company" | "terms" | "complete";

// Function to replace contract variables
function replaceContractVariables(
    template: string,
    data: {
        clientLegalName: string;
        clientRnc: string;
        clientAddress: string;
        clientRepresentative: string;
        providerName: string;
        initialProjects: number;
        initialUsers: number;
    }
): string {
    const today = new Date().toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return template
        .replace(/\{\{CLIENTE_RAZON_SOCIAL\}\}/g, data.clientLegalName || "—")
        .replace(/\{\{CLIENTE_RNC\}\}/g, data.clientRnc || "—")
        .replace(/\{\{CLIENTE_DIRECCION\}\}/g, data.clientAddress || "—")
        .replace(/\{\{CLIENTE_REPRESENTANTE\}\}/g, data.clientRepresentative || "—")
        .replace(/\{\{PROYECTOS_INICIALES\}\}/g, String(data.initialProjects || 0))
        .replace(/\{\{USUARIOS_INICIALES\}\}/g, String(data.initialUsers || 0))
        .replace(/\{\{PROVEEDOR_NOMBRE\}\}/g, data.providerName || "—")
        .replace(/\{\{FECHA_ACTUAL\}\}/g, today);
}

export function OnboardingForm({ token, company, contact, userExists = false, contractTemplate, providerName }: OnboardingFormProps) {
    const router = useRouter();
    // If user already exists, skip to company step
    const [step, setStep] = useState<Step>(userExists ? "company" : "account");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Account form state
    const [name, setName] = useState(contact.fullName);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Company form state
    const [legalName, setLegalName] = useState(company.legalName || "");
    const [taxId, setTaxId] = useState(company.taxId || "");
    const [fiscalAddress, setFiscalAddress] = useState(company.fiscalAddress || "");

    // Terms state
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleAccountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        try {
            const result = await registerClientUser(token, name, password);

            if ("error" in result && result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Auto-login after registration
            await signIn("credentials", {
                email: contact.email,
                password,
                redirect: false,
            });

            setStep("company");
        } catch (err) {
            setError("Ocurrió un error. Intenta de nuevo.");
        }

        setLoading(false);
    };

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!legalName.trim() || !taxId.trim() || !fiscalAddress.trim()) {
            setError("Todos los campos son requeridos");
            return;
        }

        setLoading(true);

        try {
            const result = await updateCompanyData(company.id, {
                legalName: legalName.trim(),
                taxId: taxId.trim(),
                fiscalAddress: fiscalAddress.trim(),
            });

            if ("error" in result && result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            setStep("terms");
        } catch (err) {
            setError("Ocurrió un error. Intenta de nuevo.");
        }

        setLoading(false);
    };

    const handleAcceptTerms = async () => {
        if (!termsAccepted) {
            setError("Debes aceptar los términos y condiciones");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await acceptTermsAndConditions(
                company.id,
                contact.id,
                name,
                token
            );

            if ("error" in result && result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            setStep("complete");
        } catch (err) {
            setError("Ocurrió un error. Intenta de nuevo.");
        }

        setLoading(false);
    };

    const goToPortal = () => {
        router.push("/portal");
    };

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Progress Steps */}
            <div className="bg-nearby-dark px-6 py-4">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <StepIndicator
                        number={1}
                        label="Cuenta"
                        active={step === "account"}
                        completed={step !== "account"}
                    />
                    <div className="flex-1 h-1 bg-white/30 mx-2" />
                    <StepIndicator
                        number={2}
                        label="Empresa"
                        active={step === "company"}
                        completed={step === "terms" || step === "complete"}
                    />
                    <div className="flex-1 h-1 bg-white/30 mx-2" />
                    <StepIndicator
                        number={3}
                        label="Contrato"
                        active={step === "terms"}
                        completed={step === "complete"}
                    />
                </div>
            </div>

            <div className="p-8">
                {error && (
                    <div className="mb-6 bg-error-red/10 border border-error-red text-error-red px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {step === "account" && (
                    <form onSubmit={handleAccountSubmit} className="space-y-6">
                        <div className="text-center mb-6">
                            <User className="mx-auto text-nearby-accent mb-3" size={40} />
                            <h2 className="text-xl font-semibold text-nearby-dark">
                                Crear tu cuenta
                            </h2>
                            <p className="text-dark-slate mt-1">
                                Bienvenido, {contact.fullName}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={contact.email}
                                disabled
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md bg-soft-gray text-dark-slate"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Confirmar contraseña
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? "Creando cuenta..." : "Continuar"}
                        </button>
                    </form>
                )}

                {step === "company" && (
                    <form onSubmit={handleCompanySubmit} className="space-y-6">
                        <div className="text-center mb-6">
                            <Building2 className="mx-auto text-nearby-accent mb-3" size={40} />
                            <h2 className="text-xl font-semibold text-nearby-dark">
                                Datos de la Empresa
                            </h2>
                            <p className="text-dark-slate mt-1">{company.name}</p>
                            {userExists && (
                                <p className="text-sm text-success-green mt-2">
                                    ¡Bienvenido de nuevo, {contact.fullName}! Completa los datos de la empresa.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Razón Social *
                            </label>
                            <input
                                type="text"
                                value={legalName}
                                onChange={(e) => setLegalName(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                                placeholder="Nombre legal de la empresa"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                RNC *
                            </label>
                            <input
                                type="text"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                                placeholder="Ej: 123-45678-9"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Dirección Fiscal *
                            </label>
                            <textarea
                                value={fiscalAddress}
                                onChange={(e) => setFiscalAddress(e.target.value)}
                                required
                                rows={3}
                                className="w-full px-3 py-2 border border-graphite-gray rounded-md focus:ring-nearby-accent focus:border-nearby-accent"
                                placeholder="Dirección completa para facturación"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? "Guardando..." : "Continuar"}
                        </button>
                    </form>
                )}

                {step === "terms" && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <FileText className="mx-auto text-nearby-accent mb-3" size={40} />
                            <h2 className="text-xl font-semibold text-nearby-dark">
                                Términos y Condiciones
                            </h2>
                        </div>

                        {/* Contract Preview with dynamic template */}
                        <div className="bg-soft-gray border border-graphite-gray rounded-md p-6 max-h-96 overflow-y-auto">
                            <div 
                                className="prose prose-sm max-w-none text-dark-slate"
                                dangerouslySetInnerHTML={{ 
                                    __html: replaceContractVariables(contractTemplate, {
                                        clientLegalName: legalName || company.legalName || "",
                                        clientRnc: taxId || company.taxId || "",
                                        clientAddress: fiscalAddress || company.fiscalAddress || "",
                                        clientRepresentative: name,
                                        providerName: providerName,
                                        initialProjects: company.initialProjects || 0,
                                        initialUsers: company.initialUsers || 0,
                                    })
                                }}
                            />
                        </div>

                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="acceptTerms"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-4 w-4 text-nearby-accent focus:ring-nearby-accent border-graphite-gray rounded"
                            />
                            <label htmlFor="acceptTerms" className="text-sm text-dark-slate">
                                He leído y acepto los Términos y Condiciones del contrato de servicios
                                con NEARBY. Entiendo que esta aceptación tiene validez legal y que los
                                datos proporcionados no podrán ser modificados después de aceptar.
                            </label>
                        </div>

                        <button
                            onClick={handleAcceptTerms}
                            disabled={loading || !termsAccepted}
                            className="w-full py-3 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors disabled:opacity-50"
                        >
                            {loading ? "Procesando..." : "Aceptar y Firmar"}
                        </button>
                    </div>
                )}

                {step === "complete" && (
                    <div className="text-center py-8">
                        <CheckCircle className="mx-auto text-success-green mb-4" size={64} />
                        <h2 className="text-2xl font-semibold text-nearby-dark mb-2">
                            ¡Listo!
                        </h2>
                        <p className="text-dark-slate mb-6">
                            Has aceptado exitosamente los términos y condiciones.
                            Ya puedes acceder al Portal de Clientes.
                        </p>
                        <a
                            href="/portal/login"
                            className="inline-block px-8 py-3 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors"
                        >
                            Ir al Portal
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function StepIndicator({
    number,
    label,
    active,
    completed,
}: {
    number: number;
    label: string;
    active: boolean;
    completed: boolean;
}) {
    return (
        <div className="flex flex-col items-center">
            <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    completed
                        ? "bg-success-green text-white"
                        : active
                        ? "bg-nearby-accent text-white"
                        : "bg-white/30 text-white"
                }`}
            >
                {completed ? "✓" : number}
            </div>
            <span className="text-xs text-white mt-1">{label}</span>
        </div>
    );
}
