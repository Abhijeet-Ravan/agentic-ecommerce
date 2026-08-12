import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

type ProductSectionProps = {
  title: string;
  products: Product[];
  eyebrow?: string;
  viewAllHref?: string;
};

export default function ProductSection({
  title,
  products,
  eyebrow,
  viewAllHref = "/products",
}: ProductSectionProps) {
  if (!products.length) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 md:py-16">
      <div className="mb-7 flex items-end justify-between gap-4 md:mb-9">
        <div>
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h2>
        </div>

        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold underline underline-offset-4"
        >
          View all
        </Link>
      </div>

      <div className="home-product-scroll -mx-5 -mb-24 overflow-x-auto px-5 pb-24 sm:-mx-6 sm:px-6">
        {" "}
        <div className="grid w-max grid-flow-col auto-cols-[175px] gap-5 sm:auto-cols-[220px] md:auto-cols-[250px] lg:auto-cols-[270px]">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
