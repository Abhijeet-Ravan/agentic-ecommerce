import Link from "next/link";

const shopLinks = [
  { label: "Men", href: "/products?gender=men" },
  { label: "Women", href: "/products?gender=women" },
  { label: "Kids", href: "/products?gender=kids" },
  { label: "Accessories", href: "/products?category=accessories" },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link
            href="/"
            className="text-3xl font-bold italic tracking-tight text-red-500"
          >
            Stride
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-gray-400">
            A footwear ecommerce proof of concept built around a real product
            catalogue and modern shopping flows.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Shop
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-gray-400">
            {shopLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Customer Service
          </h2>
          <div className="mt-5 space-y-3 text-sm text-gray-400">
            <p>Customer care: 09666200300</p>
            <p>Browse the catalogue for current POC product information.</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            About Stride
          </h2>
          <p className="mt-5 text-sm leading-6 text-gray-400">
            This storefront is a demonstration environment. Product data and
            availability represent a collected storefront snapshot rather than
            live inventory.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Stride. Ecommerce POC.</p>
          <p>Demo storefront — no live checkout.</p>
        </div>
      </div>
    </footer>
  );
}
