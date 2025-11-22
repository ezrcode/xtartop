import { getContacts } from "@/actions/contacts";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ContactsPage() {
    const contacts = await getContacts();

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-xtartop-black">Contactos</h1>
                <Link
                    href="/app/contacts/new"
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-xtartop-black rounded-md hover:bg-gray-900 transition-colors"
                >
                    <Plus size={16} className="mr-2" />
                    Nuevo
                </Link>
            </div>

            {/* Content */}
            <div className="bg-white border border-graphite-gray rounded-lg shadow-sm overflow-hidden">
                {contacts.length === 0 ? (
                    <div className="p-12 text-center">
                        <h3 className="text-lg font-medium text-dark-slate mb-2">No hay contactos aún</h3>
                        <p className="text-gray-500 mb-6">Comienza creando tu primer contacto.</p>
                        <Link
                            href="/app/contacts/new"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-founder-blue bg-founder-blue/10 rounded-md hover:bg-founder-blue/20 transition-colors"
                        >
                            Crear contacto
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
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
                )}
            </div>
        </div>
    );
}
