import { getInvitationByToken } from "@/actions/client-invitation";
import { OnboardingForm } from "@/components/portal/onboarding-form";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Default contract template - must match the one in settings-page.tsx
const DEFAULT_CONTRACT_TEMPLATE = `<h2 style="text-align: center;">Contrato de Prestación de Servicios y Términos de Uso</h2>
<p style="text-align: center;"><strong>(Versión Estándar)</strong></p>

<hr/>

<h3>ENTRE:</h3>

<p><strong>DE UNA PARTE:</strong> La sociedad NEARBY PROPTECH SOLUTIONS, S.A.S., sociedad comercial organizada bajo las leyes de la República Dominicana, RNC 1-3253017-9, con domicilio en la Av. John F. Kennedy No. 88, sector Jardines del Norte, Santo Domingo, República Dominicana. Parte que en lo sucesivo del presente contrato se denominará <strong>LA PRIMERA PARTE</strong>.</p>

<p><strong>DE LA OTRA PARTE:</strong> La persona física o jurídica cuyos datos de identidad, Registro Nacional de Contribuyentes (RNC) o documento equivalente, domicilio, y datos de su representante legal (nombre, nacionalidad y documento de identidad) han sido completados en el formulario de registro de la plataforma y/o constan en la Cotización N° <strong>{{ID_COTIZACION}}</strong>, parte que en lo sucesivo del presente contrato se denominará <strong>LA SEGUNDA PARTE</strong>.</p>

<p>Cuando sean referidos conjuntamente se denominarán <strong>LAS PARTES</strong>. Este Contrato constituye la totalidad del acuerdo y prevalece sobre convenios previos.</p>

<hr/>

<h3>PREÁMBULO:</h3>

<p><strong>POR CUANTO:</strong> LA SEGUNDA PARTE tiene el interés de contratar a LA PRIMERA PARTE para los servicios de implementación, soporte y mantenimiento de la plataforma "Nearby CRM". <strong>POR LO TANTO</strong>, las partes han convenido lo siguiente:</p>

<hr/>

<h4>ARTÍCULO PRIMERO: Objeto del Contrato</h4>
<p>LA PRIMERA PARTE es contratada para implementar y dar soporte a "Nearby CRM" con la finalidad de gestionar transacciones comerciales, proyectos inmobiliarios o unidades, de acuerdo con las condiciones definidas en la propuesta técnica y económica recibida y aceptada por LA SEGUNDA PARTE, la cual se identifica como Cotización N° <strong>{{ID_COTIZACION}}</strong>.</p>

<h4>ARTÍCULO SEGUNDO: Alcance del Contrato</h4>
<p>Los servicios comprenden la gestión de implementación, soporte y mantenimiento exclusivamente para incidencias en arquitectura, configuración, desarrollo y reporting de Nearby CRM, ajustada al plan contratado según la Cotización N° <strong>{{ID_COTIZACION}}</strong>.</p>

<h4>ARTÍCULO TERCERO: Manejo de Solicitudes y Garantía</h4>
<p>El soporte se gestionará mediante tickets, disponibles 24/7. Si LA SEGUNDA PARTE dura más de 48 horas calendario realizando pruebas tras una atención, el servicio se considerará entregado. No se realizarán reembolsos después de ejecutado el setup. La garantía cubre fallas técnicas por uso correcto y no cubre daños por uso indebido.</p>
<p><strong>PÁRRAFO I:</strong> Las incidencias se tratarán de forma independiente y secuencial, priorizando desde Fallas en la instancia (Prioridad 1) hasta fallas de un solo usuario (Prioridad 4).</p>
<p><strong>PÁRRAFO II:</strong> No se incluyen desarrollos nuevos o personalizaciones adicionales a lo establecido en la Cotización N° <strong>{{ID_COTIZACION}}</strong>. Requerimientos adicionales serán cotizados por horas de servicio.</p>
<p><strong>PÁRRAFO III:</strong> El servicio comprende la cantidad de usuarios (<strong>{{USUARIOS_INICIALES}}</strong>), proyectos (<strong>{{PROYECTOS_INICIALES}}</strong>) e instancias definidos en la Cotización N° <strong>{{ID_COTIZACION}}</strong>, incluyendo backups, actualizaciones, soporte y capacitación.</p>

<h4>ARTÍCULO CUARTO: Acuerdo Económico y Forma de Pago</h4>
<p>LA SEGUNDA PARTE pagará a LA PRIMERA PARTE por los servicios referidos, las sumas de los importes contratados según la Cotización N° <strong>{{ID_COTIZACION}}</strong> de fecha <strong>{{FECHA_ACTUAL}}</strong>, tanto para la implementación como para la suscripción mensual, de acuerdo con los plazos, condiciones y formas de pago establecidos en dicha propuesta.</p>
<p><strong>PÁRRAFO I:</strong> La facturación se realizará de forma automática mensualmente los días uno (1) de cada mes. El pago deberá realizarse sin falta dentro de los primeros cinco (5) días continuos a la facturación, mediante transferencia bancaria o medio de pago establecido por LA PRIMERA PARTE, en las cuentas bancarias indicadas en la facturación, a la tasa de cambio vigente indicada en la factura cuando sea en moneda local.</p>
<p><strong>PÁRRAFO II:</strong> Habrá un incremento en la mensualidad cuando se soliciten nuevos usuarios, proyectos o instancias, las cuales serán cobradas al precio de lista actual que se encuentre a la fecha de la solicitud. Los usuarios y proyectos adicionales se incluirán o reducirán de la facturación recurrente al momento de su activación o desactivación.</p>
<p><strong>PÁRRAFO III:</strong> El sistema realizará un bloqueo automático tras cinco (5) días laborables de mora hasta que se salde la deuda.</p>

<h4>ARTÍCULO QUINTO: Duración del Contrato</h4>
<p>La duración del presente contrato se mantendrá vigente de mes a mes mientras LA SEGUNDA PARTE mantenga activa su suscripción mensual. LA SEGUNDA PARTE podrá cancelar el servicio en cualquier momento, siempre que su cuenta esté al día. En caso de cancelación en medio de un mes ya facturado, la suscripción permanecerá activa hasta el siguiente corte (día 1 del mes siguiente).</p>
<p><strong>PÁRRAFO I: Terminación Del Contrato -</strong> Cualquiera de LAS PARTES podrá solicitar la resolución de este contrato, cuando alguna haya incumplido las obligaciones contraídas en él.</p>
<p><u>Son causas de terminación del Contrato por LA PRIMERA PARTE:</u></p>
<ol>
<li>Demora de LA SEGUNDA PARTE en el pago por más de treinta (30) días desde la fecha de facturación correspondiente.</li>
<li>Incumplimiento a las obligaciones de confidencialidad, pactadas entre LAS PARTES.</li>
<li>Incumplimiento de las obligaciones contractuales asumidas por LA SEGUNDA PARTE.</li>
<li>Cuando LA SEGUNDA PARTE ha sido declarada en quiebra o atraso, o se disuelve la sociedad sin antes haber traspasado el Contrato previo acuerdo entre LAS PARTES.</li>
</ol>
<p><u>Son causas de terminación del Contrato por LA SEGUNDA PARTE:</u></p>
<ol>
<li>Cuando LA PRIMERA PARTE ha sido declarada en quiebra o atraso, o se disuelve la sociedad sin antes haber traspasado el contrato previo acuerdo entre LAS PARTES.</li>
<li>Incumplimiento a las obligaciones de confidencialidad, pactadas entre LAS PARTES.</li>
<li>Incumplimiento de las obligaciones contractuales asumidas por LA PRIMERA PARTE.</li>
</ol>

<h4>ARTÍCULO SEXTO: Confidencialidad</h4>
<p>LAS PARTES mediante este contrato se comprometen a mantener toda la información recibida e intercambiada entre las mismas bajo estricta confidencialidad. El compromiso de confidencialidad mantendrá su vigencia inclusive hasta después de la terminación del presente contrato. Se exceptúa de este compromiso aquella información que: (i) sea de dominio público, (ii) se haga de dominio público por causas no atribuibles a algunas de LAS PARTES, (iii) fuera requerida por alguna autoridad pública competente, o (iv) exista autorización escrita de la otra Parte para su divulgación.</p>

<h4>ARTÍCULO SÉPTIMO: No Cesión</h4>
<p>LA SEGUNDA PARTE no podrá ceder este contrato sin consentimiento previo. LA PRIMERA PARTE puede cederlo a terceros o afiliadas sin previo aviso.</p>

<h4>ARTÍCULO OCTAVO: Caso Fortuito</h4>
<p>Ninguna parte será responsable por eventos de fuerza mayor (catástrofes, huelgas, ataques externos) que impidan la prestación del servicio.</p>

<h4>ARTÍCULO NOVENO: Anti Corrupción y Prevención de Lavado</h4>
<p>LAS PARTES aceptan y se obligan a no llevar a cabo ninguna práctica que pueda ser considerada como corruptible. Del mismo modo, declaran realizar esfuerzos razonables para asegurar que ninguno de los fondos recibidos y/o servicios prestados tiene origen en alguna actividad considerada como delictiva.</p>

<h4>ARTÍCULO DÉCIMO: Ley Aplicable</h4>
<p>LAS PARTES hacen elección de domicilio en sus respectivos domicilios indicados al inicio de este Contrato. El mismo estará regido y deberá ser interpretado de conformidad con las leyes de la República Dominicana.</p>

<hr/>

<h3>DATOS DEL CLIENTE</h3>
<ul>
<li><strong>Razón Social:</strong> {{CLIENTE_RAZON_SOCIAL}}</li>
<li><strong>RNC:</strong> {{CLIENTE_RNC}}</li>
<li><strong>Dirección:</strong> {{CLIENTE_DIRECCION}}</li>
<li><strong>Representante:</strong> {{CLIENTE_REPRESENTANTE}}</li>
</ul>

<hr/>

<p style="margin-top: 30px;"><strong>ACEPTACIÓN:</strong></p>
<p>He leído y acepto los Términos y Condiciones de Uso de la plataforma Nearby CRM y la Cotización N° <strong>{{ID_COTIZACION}}</strong> vinculada a mi cuenta. Entiendo que esta aceptación digital tiene la misma validez legal que una firma manuscrita de acuerdo con la legislación vigente.</p>`;

interface OnboardingPageProps {
    params: Promise<{ token: string }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);

    // Check if user already exists for this contact
    let userExists = false;
    let contractTemplate = DEFAULT_CONTRACT_TEMPLATE;
    let providerName = "NEARBY";
    
    if (invitation?.contact?.email) {
        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.contact.email },
        });
        userExists = !!existingUser;
    }

    // Get workspace contract template
    if (invitation?.company?.workspaceId) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: invitation.company.workspaceId },
            select: {
                contractTemplate: true,
                legalName: true,
                name: true,
            },
        });
        if (workspace?.contractTemplate) {
            contractTemplate = workspace.contractTemplate;
        }
        providerName = workspace?.legalName || workspace?.name || "NEARBY";
    }

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
                        userExists={userExists}
                        contractTemplate={contractTemplate}
                        providerName={providerName}
                    />
                )}
            </div>
        </div>
    );
}
