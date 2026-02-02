import { getCompanies } from "@/actions/companies";
import { getTablePreferences } from "@/actions/table-preferences";
import { CompaniesTable } from "@/components/companies/companies-table";
import Link from "next/link";
import { Plus } from "lucide-react";

// Cache for 30 seconds - good balance for list pages
export const revalidate = 30;

export default async function CompaniesPage() {
    const [companies, preferences] = await Promise.all([
        getCompanies(),
        getTablePreferences("companies"),
    ]);

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-nearby-dark">Empresas</h1>
                        <p className="text-dark-slate mt-2 text-sm sm:text-base">
                            Gestiona tu cartera de empresas y clientes
                        </p>
                    </div>
                    <Link
                        href="/app/companies/new"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900 transition-colors"
                    >
                        <Plus size={20} className="mr-2" />
                        Nueva Empresa
                    </Link>
                </div>

                {/* Companies Table */}
                <CompaniesTable companies={companies} initialPreferences={preferences} />
            </div>
        </div>
    );
}
