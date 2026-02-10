import MarketplaceCategoryPage, { revalidate } from "../[category]/page";

export { revalidate };

export default async function PeptidesMarketplacePage() {
	return MarketplaceCategoryPage({ params: { category: "peptides" } });
}
