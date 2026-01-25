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
    };
    contact: {
        id: string;
        fullName: string;
        email: string;
    };
    userExists?: boolean;
}

type Step = "account" | "company" | "terms" | "complete";

export function OnboardingForm({ token, company, contact, userExists = false }: OnboardingFormProps) {
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

                        {/* Contract Preview */}
                        <div className="bg-soft-gray border border-graphite-gray rounded-md p-6 max-h-96 overflow-y-auto">
                            <h3 className="font-semibold text-nearby-dark mb-4">
                                CONTRATO DE SERVICIOS
                            </h3>
                            <p className="text-sm text-dark-slate mb-4">
                                Entre las partes:
                            </p>
                            <p className="text-sm text-dark-slate mb-2">
                                <strong>PROVEEDOR:</strong> NEARBY, S.R.L.
                            </p>
                            <p className="text-sm text-dark-slate mb-4">
                                <strong>CLIENTE:</strong> {legalName || company.legalName}<br />
                                <strong>RNC:</strong> {taxId || company.taxId}<br />
                                <strong>Dirección:</strong> {fiscalAddress || company.fiscalAddress}
                            </p>
                            <p className="text-sm text-dark-slate mb-4">
                                <strong>Representado por:</strong> {name}
                            </p>
                            
                            <hr className="my-4" />
                            
                            <h4 className="font-semibold text-nearby-dark mb-2">
                                CLÁUSULA PRIMERA: OBJETO
                            </h4>
                            <p className="text-sm text-dark-slate mb-4">
                                El presente contrato tiene por objeto establecer los términos y condiciones 
                                bajo los cuales NEARBY prestará servicios al CLIENTE.
                            </p>

                            <h4 className="font-semibold text-nearby-dark mb-2">
                                CLÁUSULA SEGUNDA: OBLIGACIONES
                            </h4>
                            <p className="text-sm text-dark-slate mb-4">
                                El CLIENTE se compromete a proporcionar información veraz y actualizada,
                                así como a cumplir con los pagos acordados en tiempo y forma.
                            </p>

                            <h4 className="font-semibold text-nearby-dark mb-2">
                                CLÁUSULA TERCERA: CONFIDENCIALIDAD
                            </h4>
                            <p className="text-sm text-dark-slate mb-4">
                                Ambas partes se comprometen a mantener la confidencialidad de toda
                                información compartida durante la vigencia de este contrato.
                            </p>

                            <h4 className="font-semibold text-nearby-dark mb-2">
                                CLÁUSULA CUARTA: VIGENCIA
                            </h4>
                            <p className="text-sm text-dark-slate">
                                Este contrato entrará en vigor a partir de la fecha de aceptación
                                y tendrá una duración indefinida hasta que alguna de las partes
                                decida terminarlo con previo aviso de 30 días.
                            </p>
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
                        <button
                            onClick={goToPortal}
                            className="px-8 py-3 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors"
                        >
                            Ir al Portal
                        </button>
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
