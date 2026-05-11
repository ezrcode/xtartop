"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

interface PortalDocumentsCardProps {
    company: {
        name: string;
        legalName: string | null;
        taxId: string | null;
        fiscalAddress: string | null;
        initialProjects: number | null;
        initialUsers: number | null;
        quoteId: string | null;
        quoteFileUrl: string | null;
        termsAccepted: boolean;
        termsAcceptedAt: Date | null;
        termsAcceptedByName: string | null;
    };
    workspace: {
        name: string;
        legalName: string | null;
        contractTemplate: string | null;
    } | null;
    approverEmail?: string | null;
}

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
        quoteId: string;
        acceptanceDate: string;
    }
) {
    return template
        .replace(/\{\{CLIENTE_RAZON_SOCIAL\}\}/g, data.clientLegalName || "—")
        .replace(/\{\{CLIENTE_RNC\}\}/g, data.clientRnc || "—")
        .replace(/\{\{CLIENTE_DIRECCION\}\}/g, data.clientAddress || "—")
        .replace(/\{\{CLIENTE_REPRESENTANTE\}\}/g, data.clientRepresentative || "—")
        .replace(/\{\{PROYECTOS_INICIALES\}\}/g, String(data.initialProjects || 0))
        .replace(/\{\{USUARIOS_INICIALES\}\}/g, String(data.initialUsers || 0))
        .replace(/\{\{ID_COTIZACION\}\}/g, data.quoteId || "—")
        .replace(/\{\{PROVEEDOR_NOMBRE\}\}/g, data.providerName || "—")
        .replace(/\{\{FECHA_ACTUAL\}\}/g, data.acceptanceDate || "—");
}

export function PortalDocumentsCard({ company, workspace, approverEmail }: PortalDocumentsCardProps) {
    const signedContractRef = useRef<HTMLDivElement>(null);
    const [isGeneratingContractPdf, setIsGeneratingContractPdf] = useState(false);
    const [contractPdfError, setContractPdfError] = useState<string | null>(null);

    const acceptanceDateTime = useMemo(() => {
        if (!company.termsAcceptedAt) return null;
        return new Date(company.termsAcceptedAt).toLocaleString("es-DO", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [company.termsAcceptedAt]);

    const signedContractHtml = useMemo(() => {
        if (!company.termsAccepted) return "";

        const template = workspace?.contractTemplate?.trim()
            ? workspace.contractTemplate
            : `<h2 style="text-align: center;">Contrato de Términos y Condiciones</h2><p>Se deja constancia de la aceptación de los términos y condiciones asociados a la cotización <strong>{{ID_COTIZACION}}</strong>.</p><h3>Datos del cliente</h3><ul><li><strong>Razón Social:</strong> {{CLIENTE_RAZON_SOCIAL}}</li><li><strong>RNC:</strong> {{CLIENTE_RNC}}</li><li><strong>Dirección:</strong> {{CLIENTE_DIRECCION}}</li><li><strong>Representante:</strong> {{CLIENTE_REPRESENTANTE}}</li></ul>`;

        return replaceContractVariables(template, {
            clientLegalName: company.legalName || "",
            clientRnc: company.taxId || "",
            clientAddress: company.fiscalAddress || "",
            clientRepresentative: company.termsAcceptedByName || "",
            providerName: workspace?.legalName || workspace?.name || "NEARBY",
            initialProjects: company.initialProjects || 0,
            initialUsers: company.initialUsers || 0,
            quoteId: company.quoteId || "",
            acceptanceDate: company.termsAcceptedAt
                ? new Date(company.termsAcceptedAt).toLocaleDateString("es-DO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
                : "—",
        });
    }, [
        company.fiscalAddress,
        company.initialProjects,
        company.initialUsers,
        company.legalName,
        company.quoteId,
        company.taxId,
        company.termsAccepted,
        company.termsAcceptedAt,
        company.termsAcceptedByName,
        workspace?.contractTemplate,
        workspace?.legalName,
        workspace?.name,
    ]);

    const handleDownloadSignedContract = async () => {
        if (!company.termsAccepted || !signedContractRef.current) return;

        setIsGeneratingContractPdf(true);
        setContractPdfError(null);

        try {
            const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                import("html2canvas"),
                import("jspdf"),
            ]);

            const canvas = await html2canvas(signedContractRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    const styleNodes = clonedDoc.querySelectorAll("style, link[rel='stylesheet']");
                    styleNodes.forEach((node) => node.remove());

                    const clonedTarget = clonedDoc.getElementById("portal-signed-contract-pdf-content");
                    if (clonedTarget) {
                        (clonedTarget as HTMLElement).style.position = "static";
                        (clonedTarget as HTMLElement).style.left = "0";
                        (clonedTarget as HTMLElement).style.top = "0";
                        (clonedTarget as HTMLElement).style.width = "794px";
                        (clonedTarget as HTMLElement).style.background = "#ffffff";
                        (clonedTarget as HTMLElement).style.color = "#111111";
                    }

                    clonedDoc.body.style.margin = "0";
                    clonedDoc.body.style.background = "#ffffff";
                    clonedDoc.body.style.color = "#111111";
                },
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            const contentWidth = pageWidth - margin * 2;
            const contentHeightPerPage = pageHeight - margin * 2;
            const imageHeight = (canvas.height * contentWidth) / canvas.width;
            const imageData = canvas.toDataURL("image/jpeg", 0.9);

            let heightLeft = imageHeight;
            let position = margin;

            pdf.addImage(imageData, "JPEG", margin, position, contentWidth, imageHeight, undefined, "FAST");
            heightLeft -= contentHeightPerPage;

            while (heightLeft > 1) {
                pdf.addPage();
                position = margin - (imageHeight - heightLeft);
                pdf.addImage(imageData, "JPEG", margin, position, contentWidth, imageHeight, undefined, "FAST");
                heightLeft -= contentHeightPerPage;
            }

            const safeCompanyName = (company.name || "empresa")
                .replace(/[^a-zA-Z0-9_-]/g, "_")
                .slice(0, 40);
            const acceptanceDate = company.termsAcceptedAt
                ? new Date(company.termsAcceptedAt).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10);

            pdf.save(`acuerdo-terminos-${safeCompanyName}-${acceptanceDate}.pdf`);
        } catch (error) {
            console.error("Error generating portal signed contract PDF:", error);
            setContractPdfError("No se pudo generar el PDF del acuerdo. Intenta de nuevo.");
        } finally {
            setIsGeneratingContractPdf(false);
        }
    };

    if (!company.quoteFileUrl && !company.termsAccepted) {
        return null;
    }

    return (
        <>
            <div className="bg-white rounded-lg border border-graphite-gray p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <FileText className="text-nearby-dark" size={24} />
                    <h2 className="text-lg font-semibold text-nearby-dark">Documentos</h2>
                </div>

                <p className="text-sm text-dark-slate mb-5">
                    Descarga la cotización enviada y, una vez aceptado el acuerdo, el documento firmado con su evidencia digital.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    {company.quoteFileUrl && (
                        <a
                            href={company.quoteFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-nearby-dark text-white text-sm rounded-md hover:bg-nearby-dark-600 transition-colors"
                        >
                            <Download size={16} className="mr-2" />
                            Descargar cotización
                        </a>
                    )}

                    {company.termsAccepted && (
                        <button
                            type="button"
                            onClick={handleDownloadSignedContract}
                            disabled={isGeneratingContractPdf}
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-nearby-dark text-white text-sm rounded-md hover:bg-nearby-dark-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isGeneratingContractPdf ? (
                                <>
                                    <Loader2 size={16} className="mr-2 animate-spin" />
                                    Generando acuerdo...
                                </>
                            ) : (
                                <>
                                    <Download size={16} className="mr-2" />
                                    Descargar acuerdo firmado
                                </>
                            )}
                        </button>
                    )}
                </div>

                {contractPdfError && (
                    <p className="text-xs text-error-red mt-3">{contractPdfError}</p>
                )}
            </div>

            {company.termsAccepted && (
                <div
                    id="portal-signed-contract-pdf-content"
                    ref={signedContractRef}
                    style={{
                        position: "fixed",
                        left: "-99999px",
                        top: "0",
                        width: "794px",
                        background: "#ffffff",
                        color: "#111111",
                        padding: "40px",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "14px",
                        lineHeight: "1.5",
                    }}
                    aria-hidden="true"
                >
                    <div
                        style={{ color: "#111111" }}
                        dangerouslySetInnerHTML={{ __html: signedContractHtml }}
                    />
                    <hr style={{ margin: "24px 0", borderColor: "#d1d5db" }} />
                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Evidencia de aceptación digital</h3>
                    <p style={{ marginBottom: "12px" }}>
                        Este acuerdo fue aceptado digitalmente por el cliente en la plataforma.
                    </p>
                    <ul style={{ paddingLeft: "20px", margin: 0 }}>
                        <li><strong>Fecha y hora de aceptación:</strong> {acceptanceDateTime || "—"}</li>
                        <li><strong>Nombre del aprobador:</strong> {company.termsAcceptedByName || "—"}</li>
                        <li><strong>Correo del aprobador:</strong> {approverEmail || "—"}</li>
                    </ul>
                </div>
            )}
        </>
    );
}
