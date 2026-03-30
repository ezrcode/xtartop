import { getPurchaseOrder, getSuppliers, isDecimaEnabled } from "@/actions/purchase-orders";
import { getDecimaProducts } from "@/actions/decima";
import { PurchaseOrderForm } from "@/components/purchases/purchase-order-form";
import { ClientOnly } from "@/components/client-only";
import { notFound } from "next/navigation";

export const revalidate = 60;

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
    const { id } = await params;
    const [order, suppliers, decimaEnabled] = await Promise.all([
        getPurchaseOrder(id),
        getSuppliers(),
        isDecimaEnabled(),
    ]);

    if (!order) {
        notFound();
    }

    let decimaProducts: { code: string; name: string }[] = [];
    if (decimaEnabled) {
        const result = await getDecimaProducts();
        if (result.success && result.products) {
            decimaProducts = result.products.map((p) => ({
                code: p.code,
                name: p.name,
            }));
        }
    }

    return (
        <ClientOnly>
            <PurchaseOrderForm
                order={order}
                suppliers={suppliers}
                decimaProducts={decimaProducts}
                decimaEnabled={decimaEnabled}
                isEditMode={true}
            />
        </ClientOnly>
    );
}
