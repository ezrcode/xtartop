import { getPurchaseOrder, getSuppliers, isDecimaEnabled } from "@/actions/purchase-orders";
import { getDecimaProducts, getDecimaPromotions } from "@/actions/decima";
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

    let decimaProducts: { code: string; name: string; cost: number }[] = [];
    let decimaPromotions: { code: string; name: string; type: "PERCENTAGE" | "FIXED"; value: number; productCodes: string[] }[] = [];

    if (decimaEnabled) {
        const [prodResult, promoResult] = await Promise.all([
            getDecimaProducts(),
            getDecimaPromotions(),
        ]);
        if (prodResult.success && prodResult.products) {
            decimaProducts = prodResult.products.map((p) => ({
                code: p.code,
                name: p.name,
                cost: p.cost || 0,
            }));
        }
        if (promoResult.success && promoResult.promotions) {
            decimaPromotions = promoResult.promotions.map((p) => ({
                code: p.code,
                name: p.name,
                type: p.type,
                value: p.value,
                productCodes: p.products.map((pr) => pr.code),
            }));
        }
    }

    return (
        <ClientOnly>
            <PurchaseOrderForm
                order={order}
                suppliers={suppliers}
                decimaProducts={decimaProducts}
                decimaPromotions={decimaPromotions}
                decimaEnabled={decimaEnabled}
                isEditMode={true}
            />
        </ClientOnly>
    );
}
