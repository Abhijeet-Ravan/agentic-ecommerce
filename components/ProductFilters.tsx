"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

type FilterOptions = {
  genders: string[];
  categories: string[];
  materials: string[];
  colors: string[];
  sizes: number[];
};

type ProductFiltersProps = {
  options: FilterOptions;
};

export default function ProductFilters({ options }: ProductFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  function submitTextFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    for (const [name, value] of [
      ["q", query],
      ["minPrice", minPrice],
      ["maxPrice", maxPrice],
    ]) {
      if (value.trim()) params.set(name, value.trim());
      else params.delete(name);
    }

    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  return (
    <aside className="space-y-6 rounded border border-gray-200 p-5">
      <div>
        <h2 className="text-lg font-semibold">Filter products</h2>
        <Link href="/products" className="mt-1 inline-block text-sm underline">
          Clear filters
        </Link>
      </div>

      <form onSubmit={submitTextFilters} className="space-y-4">
        <label className="block text-sm font-medium">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal"
            placeholder="Loafer, Bata, leather…"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Min price
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-medium">
            Max price
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
        </div>

        <button className="w-full rounded bg-black px-4 py-2 text-sm font-semibold text-white">
          Apply search and price
        </button>
      </form>

      <FilterSelect
        label="Gender"
        value={searchParams.get("gender") ?? ""}
        options={options.genders}
        onChange={(value) => updateParam("gender", value)}
      />
      <FilterSelect
        label="Category"
        value={searchParams.get("category") ?? ""}
        options={options.categories}
        onChange={(value) => updateParam("category", value)}
      />
      <FilterSelect
        label="Material"
        value={searchParams.get("material") ?? ""}
        options={options.materials}
        onChange={(value) => updateParam("material", value)}
      />
      <FilterSelect
        label="Color"
        value={searchParams.get("color") ?? ""}
        options={options.colors}
        onChange={(value) => updateParam("color", value)}
      />
      <FilterSelect
        label="Size"
        value={searchParams.get("size") ?? ""}
        options={options.sizes.map(String)}
        onChange={(value) => updateParam("size", value)}
      />
      <FilterSelect
        label="Sort"
        value={searchParams.get("sort") ?? "relevance"}
        options={["relevance", "price-asc", "price-desc"]}
        labels={{
          relevance: "Relevance",
          "price-asc": "Price: low to high",
          "price-desc": "Price: high to low",
        }}
        onChange={(value) => updateParam("sort", value)}
        includeEmpty={false}
      />
    </aside>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  includeEmpty?: boolean;
  onChange: (value: string) => void;
};

function FilterSelect({
  label,
  value,
  options,
  labels = {},
  includeEmpty = true,
  onChange,
}: FilterSelectProps) {
  const selectedValue =
    options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? value;

  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        value={selectedValue}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
      >
        {includeEmpty && <option value="">All</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
