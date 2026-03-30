import { getPurchaseOrders } from "@/actions/purchase-orders";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";

export const revalidate = 30;

export default async function PurchasesPage() {
    const orders = await getPurchaseOrders();

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Órdenes de Compra"
                    count={orders.length}
                    description="Gestiona las órdenes de compra a proveedores"
                    icon={ShoppingCart}
                    actions={
                        <Link
                            href="/app/purchases/new"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Nueva Orden
                        </Link>
                    }
                />
                <PurchasesTable orders={orders} />
            </div>
        </div>
    );
}
