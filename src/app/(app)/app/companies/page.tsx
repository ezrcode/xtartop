import { getCompanies } from "@/actions/companies";
import Link from "next/link";
import { Plus } from "lucide-react";

// Cache for 30 seconds - good balance for list pages
export const revalidate = 30;

export default async function CompaniesPage() {
    const companies = await getCompanies();

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-xtartop-black">Empresas</h1>
                        <p className="text-dark-slate mt-2">
                            Gestiona tu cartera de empresas y clientes
                        </p>
                    </div>
                    <Link
                        href="/app/companies/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900 transition-colors"
                    >
                        <Plus size={20} className="mr-2" />
                        Nueva Empresa
                    </Link>
                </div>

                {/* Companies Table */}
                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden">
                    {companies.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-dark-slate text-lg">No hay empresas registradas</p>
                            <Link
                                href="/app/companies/new"
                                className="inline-flex items-center px-4 py-2 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-xtartop-black hover:bg-gray-900"
                            >
                                <Plus size={16} className="mr-2" />
                                Agregar primera empresa
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-graphite-gray">
                                <thead className="bg-soft-gray">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                            Nombre o Razón Social
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                            Ciudad
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                            País
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                            Contacto Principal
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-graphite-gray">
                                    {companies.map((company) => (
                                        <tr key={company.id} className="hover:bg-soft-gray transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/app/companies/${company.id}`}
                                                    className="text-sm font-medium text-founder-blue hover:text-ocean-blue"
                                                >
                                                    {company.name}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-dark-slate">
                                                    {company.city || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-dark-slate">
                                                    {company.country || "-"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {company.primaryContact ? (
                                                    <Link
                                                        href={`/app/contacts/${company.primaryContact.id}`}
                                                        className="text-sm text-founder-blue hover:text-ocean-blue"
                                                    >
                                                        {company.primaryContact.fullName}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.status === "CLIENTE"
                                                    ? "bg-success-green/10 text-success-green"
                                                    : company.status === "POTENCIAL"
                                                        ? "bg-founder-blue/10 text-founder-blue"
                                                        : company.status === "PROSPECTO"
                                                            ? "bg-gray-100 text-gray-800"
                                                            : company.status === "DESCARTADA"
                                                                ? "bg-error-red/10 text-error-red"
                                                                : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                    {company.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
