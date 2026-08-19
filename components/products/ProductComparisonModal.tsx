"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import StarRating from "@/components/StarRating";
import {
  recommendProduct,
  type ComparisonProduct,
  type ProductComparison,
} from "@/lib/commerce/compareProducts";
import type { DemoSpecifications } from "@/types/product";

type ProductComparisonModalProps = {
  comparison: ProductComparison;
};

const METRICS = [
  ["comfortScore", "Comfort"],
  ["breathabilityScore", "Breathability"],
  ["gripScore", "Grip"],
  ["durabilityScore", "Durability"],
  ["flexibilityScore", "Flexibility"],
  ["stabilityScore", "Stability"],
  ["organizationScore", "Organization"],
  ["portabilityScore", "Portability"],
] as const satisfies readonly (readonly [keyof DemoSpecifications, string])[];

function money(amount: number) {
  return `Tk ${amount.toLocaleString("en-US")}.00`;
}

function valueOrDash(value: string | null | undefined) {
  return value || "Not specified";
}

function ProductHeading({ product }: { product: ComparisonProduct }) {
  return (
    <div className="min-w-0 px-3 pb-5 pt-3 sm:px-6">
      <div className="relative mx-auto aspect-square w-full max-w-56">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.identity.name}
            fill
            sizes="(max-width: 640px) 42vw, 224px"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-xs text-gray-500">
            No image
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase text-gray-500 sm:text-xs">
        {product.brand}
      </p>
      <h2 className="mt-1 min-h-12 text-xs font-semibold leading-5 text-gray-950 sm:text-base">
        {product.identity.name}
      </h2>
      <p className="mt-1 text-sm font-semibold sm:text-lg">
        {money(product.price.amount)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-600 sm:text-xs">
        <StarRating rating={product.reviews.averageRating} />
        <span>
          {product.reviews.averageRating.toFixed(1)} ({product.reviews.reviewCount} demo reviews)
        </span>
      </div>
    </div>
  );
}

function ComparisonSection({
  title,
  a,
  b,
}: {
  title: string;
  a: React.ReactNode;
  b: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200">
      <h3 className="bg-gray-50 px-4 py-2 text-[10px] font-semibold uppercase text-gray-500 sm:px-6 sm:text-xs">
        {title}
      </h3>
      <div className="grid grid-cols-2 divide-x divide-gray-200 text-xs leading-5 text-gray-700 sm:text-sm">
        <div className="min-w-0 px-3 py-4 sm:px-6">{a}</div>
        <div className="min-w-0 px-3 py-4 sm:px-6">{b}</div>
      </div>
    </section>
  );
}

function SpecList({ product }: { product: ComparisonProduct }) {
  const specs = product.demoSpecifications;
  const values = [
    ["Upper", specs.upperMaterial ?? specs.bodyMaterial ?? product.material],
    ["Lining", specs.liningMaterial],
    ["Sole", specs.soleMaterial],
    ["Outsole", specs.outsoleType],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <dl className="space-y-2">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase text-gray-500">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FitDetails({ product }: { product: ComparisonProduct }) {
  const specs = product.demoSpecifications;

  return (
    <dl className="space-y-2">
      {[
        ["Fit", specs.fit],
        ["Width", specs.width],
        ["Closure", specs.closure],
        ["Cushioning", specs.cushioning],
        ["Arch support", specs.archSupport],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase text-gray-500">{label}</dt>
          <dd>{valueOrDash(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function MetricList({ product }: { product: ComparisonProduct }) {
  const available = METRICS.flatMap(([field, label]) => {
    const value = product.demoSpecifications[field];
    return typeof value === "number" ? [{ label, value }] : [];
  });

  return (
    <div className="space-y-3">
      {available.map(({ label, value }) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] sm:text-xs">
            <span>{label}</span>
            <span className="font-semibold text-gray-950">{value}/10</span>
          </div>
          <div className="h-1.5 overflow-hidden bg-gray-200">
            <div
              className="h-full bg-red-600"
              style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductComparisonModal({
  comparison,
}: ProductComparisonModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recommendation = recommendProduct(comparison);
  const { a, b } = comparison.products;
  const winner = recommendation.winner.slug === a.identity.slug ? a : b;
  const alternative = winner.identity.slug === a.identity.slug ? b : a;

  function close() {
    const params = new URLSearchParams(searchParams.toString());

    if (params.get("returnTo") === "cart") {
      router.replace("/cart", { scroll: false });
      return;
    }

    params.delete("compare");
    params.delete("returnTo");
    router.replace(`/products${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-2 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
        data-agni-comparison-scroll
        className="max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase text-red-700">Side by side</p>
            <h1 id="comparison-title" className="text-base font-semibold sm:text-xl">
              Product comparison
            </h1>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close comparison"
            title="Close comparison"
            className="flex h-10 w-10 items-center justify-center border border-gray-300 text-sm font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            X
          </button>
        </header>

        <div className="grid grid-cols-2 divide-x divide-gray-200">
          <ProductHeading product={a} />
          <ProductHeading product={b} />
        </div>

        <ComparisonSection
          title="Description"
          a={a.description ?? "No description available."}
          b={b.description ?? "No description available."}
        />
        <ComparisonSection
          title="Construction and material"
          a={<SpecList product={a} />}
          b={<SpecList product={b} />}
        />
        <ComparisonSection
          title="Fit and comfort"
          a={<FitDetails product={a} />}
          b={<FitDetails product={b} />}
        />
        <ComparisonSection
          title="Performance scores"
          a={<MetricList product={a} />}
          b={<MetricList product={b} />}
        />
        <ComparisonSection
          title="Best for"
          a={(a.demoSpecifications.idealFor ?? ["Everyday use"]).join(", ")}
          b={(b.demoSpecifications.idealFor ?? ["Everyday use"]).join(", ")}
        />

        <section className="border-t-4 border-red-600 bg-gray-950 px-4 py-5 text-white sm:px-6 sm:py-6">
          <p className="text-[10px] font-semibold uppercase text-red-300">Clean take</p>
          <h2 className="mt-1 text-base font-semibold sm:text-xl">
            {winner.identity.name} is the stronger overall choice.
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-200 sm:text-sm">
            It stands out for {recommendation.reasons.join(", ")} and is best suited to{" "}
            {recommendation.winnerIdealFor.join(", ").toLowerCase()}.
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-300 sm:text-sm">
            Choose {alternative.identity.name} when its style, construction or fit better matches your preference.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/products/${winner.identity.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center bg-white px-4 text-xs font-semibold text-gray-950 hover:bg-gray-100"
            >
              View recommended product
            </Link>
          </div>
          <p className="mt-4 text-[10px] text-gray-400">
            Review feedback and performance scores are synthetic demo data.
          </p>
        </section>
      </div>
    </div>
  );
}
