import { getContacts } from "@/actions/contacts";
import Link from "next/link";
import { Plus } from "lucide-react";

// Cache for 30 seconds - good balance for list pages
export const revalidate = 30;

export default async function ContactsPage() {
    const contacts = await getContacts();

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-xtartop-black">Contactos</h1>
                        <p className="text-dark-slate mt-2 text-sm sm:text-base">
                            Gestiona tu red de contactos
                        </p>
                    </div>
                    <Link
                        href="/app/contacts/new"
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-xtartop-black rounded-md hover:bg-gray-900 transition-colors"
                    >
                        <Plus size={16} className="mr-2" />
                        Nuevo
                    </Link>
                </div>

                {/* Content */}
                <div className="bg-white border border-graphite-gray rounded-lg shadow-sm overflow-hidden">
                    {contacts.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center">
                            <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-2">No hay contactos aún</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6">Comienza creando tu primer contacto.</p>
                            <Link
                                href="/app/contacts/new"
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-founder-blue bg-founder-blue/10 rounded-md hover:bg-founder-blue/20 transition-colors"
                            >
                                Crear contacto
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-graphite-gray">
                                    <thead className="bg-soft-gray">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nombre completo
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Empresa
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Correo electrónico
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-graphite-gray">
                                        {contacts.map((contact) => (
                                            <tr key={contact.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link
                                                        href={`/app/contacts/${contact.id}`}
                                                        className="text-sm font-medium text-founder-blue hover:underline"
                                                    >
                                                        {contact.fullName}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-slate">
                                                    {contact.company?.name || <span className="text-gray-400 italic">Sin empresa</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-slate">
                                                    {contact.email}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contact.status === "CLIENTE"
                                                            ? "bg-success-green/10 text-success-green"
                                                            : contact.status === "PROSPECTO"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : contact.status === "POTENCIAL"
                                                                    ? "bg-warning-amber/10 text-warning-amber"
                                                                    : contact.status === "INVERSIONISTA"
                                                                        ? "bg-purple-100 text-purple-800"
                                                                        : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {contact.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-graphite-gray">
                                {contacts.map((contact) => (
                                    <Link
                                        key={contact.id}
                                        href={`/app/contacts/${contact.id}`}
                                        className="block p-4 hover:bg-soft-gray transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-base font-semibold text-founder-blue">
                                                {contact.fullName}
                                            </h3>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contact.status === "CLIENTE"
                                                    ? "bg-success-green/10 text-success-green"
                                                    : contact.status === "PROSPECTO"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : contact.status === "POTENCIAL"
                                                            ? "bg-warning-amber/10 text-warning-amber"
                                                            : contact.status === "INVERSIONISTA"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {contact.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-dark-slate">
                                            {contact.company && (
                                                <p>
                                                    <span className="font-medium">Empresa:</span> {contact.company.name}
                                                </p>
                                            )}
                                            {contact.email && (
                                                <p className="truncate">
                                                    <span className="font-medium">Email:</span> {contact.email}
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
