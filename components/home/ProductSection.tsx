"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

type ProductSectionProps = {
  title: string;
  products: Product[];
  eyebrow?: string;
  viewAllHref?: string;
};

const ITEMS_PER_PAGE = 4;

export default function ProductSection({
  title,
  products,
  eyebrow,
  viewAllHref = "/products",
}: ProductSectionProps) {
  const [page, setPage] = useState(0);

  if (!products.length) return null;

  const pages = useMemo(() => {
    const result: Product[][] = [];

    for (let i = 0; i < products.length; i += ITEMS_PER_PAGE) {
      result.push(products.slice(i, i + ITEMS_PER_PAGE));
    }

    return result;
  }, [products]);

  const lastPage = pages.length - 1;

  const goPrevious = () => {
    setPage((current) => Math.max(current - 1, 0));
  };

  const goNext = () => {
    setPage((current) => Math.min(current + 1, lastPage));
  };

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

      <div className="relative">
        {page > 0 && (
          <button
            type="button"
            onClick={goPrevious}
            aria-label="Previous products"
            className="
  absolute left-[-42px] top-[36%] z-10
  -translate-y-1/2
  p-1
  text-black
  transition-opacity
  hover:opacity-60
"
          >
            <ChevronLeft strokeWidth={1.5} size={34} />
          </button>
        )}

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${page * 100}%)`,
            }}
          >
            {pages.map((pageProducts, pageIndex) => (
              <div
                key={pageIndex}
                className="
                  grid w-full shrink-0
                  grid-cols-2 gap-5
                  md:grid-cols-4 md:gap-6
                "
              >
                {pageProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {page < lastPage && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next products"
            className="
              absolute right-[-42px] top-[36%] z-10
              -translate-y-1/2
              p-1
              text-black
              transition-opacity
              hover:opacity-60
            "
          >
            <ChevronRight strokeWidth={1.5} size={34} />
          </button>
        )}
      </div>
    </section>
  );
}
