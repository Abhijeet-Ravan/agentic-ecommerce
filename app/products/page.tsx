import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import { getProducts } from "@/lib/commerce/getProduct";
import { searchProducts } from "@/lib/commerce/searchProducts";
import type { ProductSort } from "@/lib/commerce/types";

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalNumber(value: string | undefined) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].toSorted(
    (a, b) => a.localeCompare(b),
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const sortValue = first(params.sort);
  const sort: ProductSort =
    sortValue === "price-asc" || sortValue === "price-desc"
      ? sortValue
      : "relevance";
  const results = searchProducts({
    query: first(params.q),
    brand: first(params.brand),
    gender: first(params.gender),
    category: first(params.category),
    material: first(params.material),
    color: first(params.color),
    size: optionalNumber(first(params.size)),
    minPrice: optionalNumber(first(params.minPrice)),
    maxPrice: optionalNumber(first(params.maxPrice)),
    sort,
  });
  const allProducts = getProducts();
  const categoryOptions = unique(
    allProducts.map((product) =>
      /^(bag|belt|wallet)$/i.test(product.category ?? "")
        ? "Accessories"
        : product.category,
    ),
  );
  const filterOptions = {
    brands: unique(allProducts.map((product) => product.brand)),
    genders: unique(allProducts.map((product) => product.gender)),
    categories: categoryOptions,
    materials: unique(allProducts.map((product) => product.material)),
    colors: unique(allProducts.map((product) => product.color)),
    sizes: [
      ...new Set(allProducts.flatMap((product) => product.sizes ?? [])),
    ].toSorted((a, b) => a - b),
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10" data-agni-page="products">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Products</h1>
        <p className="mt-2 text-sm text-gray-600">
          {results.length} {results.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Suspense fallback={<div className="rounded border p-5">Loading filters…</div>}>
          <ProductFilters options={filterOptions} />
        </Suspense>

        {results.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-gray-300 p-10 text-center">
            <h2 className="text-lg font-semibold">No products found</h2>
            <p className="mt-2 text-sm text-gray-600">
              Try removing one or more filters.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
