import { getDeals } from "@/actions/deals";
import { DealsClientPage } from "@/components/deals/deals-client-page";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DealsPage() {
    const deals = await getDeals();

    return <DealsClientPage deals={deals} />;
}

