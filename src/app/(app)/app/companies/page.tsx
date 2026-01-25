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

                {/* Companies Table/Cards */}
                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray overflow-hidden">
                    {companies.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <p className="text-dark-slate text-base sm:text-lg">No hay empresas registradas</p>
                            <Link
                                href="/app/companies/new"
                                className="inline-flex items-center px-4 py-2 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-gray-900"
                            >
                                <Plus size={16} className="mr-2" />
                                Agregar primera empresa
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
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
                                                        className="text-sm font-medium text-nearby-accent hover:text-nearby-dark"
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
                                                            className="text-sm text-nearby-accent hover:text-nearby-dark"
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
                                                            ? "bg-nearby-accent/10 text-nearby-accent"
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

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-graphite-gray">
                                {companies.map((company) => (
                                    <Link
                                        key={company.id}
                                        href={`/app/companies/${company.id}`}
                                        className="block p-4 hover:bg-soft-gray transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-base font-semibold text-nearby-accent">
                                                {company.name}
                                            </h3>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.status === "CLIENTE"
                                                ? "bg-success-green/10 text-success-green"
                                                : company.status === "POTENCIAL"
                                                    ? "bg-nearby-accent/10 text-nearby-accent"
                                                    : company.status === "PROSPECTO"
                                                        ? "bg-gray-100 text-gray-800"
                                                        : company.status === "DESCARTADA"
                                                            ? "bg-error-red/10 text-error-red"
                                                            : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {company.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-dark-slate">
                                            {(company.city || company.country) && (
                                                <p>
                                                    <span className="font-medium">Ubicación:</span> {[company.city, company.country].filter(Boolean).join(", ") || "-"}
                                                </p>
                                            )}
                                            {company.primaryContact && (
                                                <p>
                                                    <span className="font-medium">Contacto:</span> {company.primaryContact.fullName}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
