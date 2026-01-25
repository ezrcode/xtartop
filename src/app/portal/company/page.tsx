import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyDataForm } from "@/components/portal/company-data-form";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function PortalCompanyPage() {
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

    if (!user || user.userType !== "CLIENT" || !user.contact?.company) {
        redirect("/portal/login");
    }

    const company = user.contact.company;

    // If already accepted, redirect to portal
    if (company.termsAccepted) {
        redirect("/portal");
    }

    return (
        <div className="max-w-2xl mx-auto">
            <CompanyDataForm
                company={{
                    id: company.id,
                    name: company.name,
                    legalName: company.legalName,
                    taxId: company.taxId,
                    fiscalAddress: company.fiscalAddress,
                    termsAccepted: company.termsAccepted,
                }}
                contact={{
                    id: user.contact.id,
                    fullName: user.contact.fullName,
                }}
                userName={user.name || user.contact.fullName}
            />
        </div>
    );
}
