import { getSuppliers, isDecimaEnabled } from "@/actions/purchase-orders";
import { getDecimaProducts } from "@/actions/decima";
import { PurchaseOrderForm } from "@/components/purchases/purchase-order-form";
import { ClientOnly } from "@/components/client-only";

export const revalidate = 120;

export default async function NewPurchaseOrderPage() {
    const [suppliers, decimaEnabled] = await Promise.all([
        getSuppliers(),
        isDecimaEnabled(),
    ]);

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
                suppliers={suppliers}
                decimaProducts={decimaProducts}
                decimaEnabled={decimaEnabled}
                isEditMode={false}
            />
        </ClientOnly>
    );
}
