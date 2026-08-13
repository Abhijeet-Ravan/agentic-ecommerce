"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

const navItems = [
  { label: "Men", href: "/products?gender=men" },
  { label: "Women", href: "/products?gender=women" },
  { label: "Kids", href: "/products?gender=kids" },
  { label: "Accessories", href: "/products?category=accessories" },
];

export default function Header() {
  const { cartItems } = useCart();

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className="bg-white">
      {/* TOP BAR */}
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl justify-end px-6 py-2 text-xs text-gray-600">
          Find A Store | Customer care: 09666200300
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-5">
          {/* LOGO */}
          <Link href="/" className="text-4xl font-bold italic text-red-600">
            Stride
          </Link>

          {/* SEARCH */}
          <form action="/products" className="hidden flex-1 md:block">
            <input
              type="search"
              name="q"
              placeholder="Search products"
              className="w-full border border-gray-300 px-4 py-3 outline-none"
            />
          </form>

          {/* ACTIONS */}
          <div className="ml-auto flex items-center gap-6 text-sm">
            <Link href="/cart" data-agni-id="header.cart">
              Cart ({cartCount})
            </Link>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-6 py-4">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="whitespace-nowrap text-sm font-semibold uppercase"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* MOBILE SEARCH */}
      <form action="/products" className="border-b border-gray-200 px-6 py-3 md:hidden">
        <input
          type="search"
          name="q"
          placeholder="Search products"
          className="w-full border border-gray-300 px-4 py-3 outline-none"
        />
      </form>
    </header>
  );
}
