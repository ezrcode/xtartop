import { getCompanies } from "@/actions/companies";
import { getTablePreferences } from "@/actions/table-preferences";
import { getUserItemsPerPage } from "@/actions/profile";
import { CompaniesTable } from "@/components/companies/companies-table";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";

export const revalidate = 30;

export default async function CompaniesPage() {
    const [companies, preferences, itemsPerPage] = await Promise.all([
        getCompanies(),
        getTablePreferences("companies"),
        getUserItemsPerPage(),
    ]);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Empresas"
                    count={companies.length}
                    description="Gestiona tu cartera de empresas y clientes"
                    icon={Building2}
                    actions={
                        <Link
                            href="/app/companies/new"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Nueva Empresa
                        </Link>
                    }
                />
                <CompaniesTable companies={companies} initialPreferences={preferences} itemsPerPage={itemsPerPage as 10 | 25 | 50} />
            </div>
        </div>
    );
}
