"use client";
//edit
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useCart } from "@/context/CartContext";
import { getProducts } from "@/lib/commerce/getProduct";

export default function CartPage() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();

  /**
   * Checking out hands the order over, so the cart is emptied. Both happen in one
   * transition — otherwise the empty-cart state paints for a frame before the
   * navigation commits.
   */
  function checkout() {
    startTransition(() => {
      clearCart();
      router.push("/checkout");
    });
  }
  const lines = cartItems.flatMap((item) => {
    const product = getProducts().find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  });
  const subtotal = lines.reduce(
    (total, { item, product }) => total + item.quantity * product.price,
    0,
  );

  if (!lines.length) {
    return (
      <main
        className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 text-center"
        data-agni-page="cart"
      >
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-gray-600">Add a product to begin your order.</p>
        <Link
          href="/products"
          className="mt-8 inline-block bg-black px-6 py-3 font-semibold text-white"
        >
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10" data-agni-page="cart">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold">Shopping cart</h1>
        <button onClick={clearCart} className="text-sm underline">
          Clear cart
        </button>
      </div>

      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {lines.map(({ item, product }) => (
          <div
            key={`${product.id}-${item.size ?? "no-size"}`}
            className="grid gap-5 py-6 sm:grid-cols-[120px_1fr_auto] sm:items-center"
          >
            <Link href={`/products/${product.slug}`} className="relative aspect-square">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-contain"
              />
            </Link>

            <div>
              <p className="text-xs uppercase text-gray-500">{product.brand}</p>
              <Link href={`/products/${product.slug}`} className="font-semibold">
                {product.name}
              </Link>
              {item.size !== undefined && (
                <p className="mt-1 text-sm text-gray-600">Size: {item.size}</p>
              )}
              <p className="mt-2">Tk {product.price.toLocaleString()}.00</p>
              <button
                onClick={() => removeFromCart(product.id, item.size)}
                className="mt-3 text-sm underline"
              >
                Remove
              </button>
            </div>

            <div className="flex items-center justify-between gap-6 sm:block sm:text-right">
              <div className="inline-flex items-center border border-gray-300">
                <button
                  onClick={() =>
                    updateQuantity(product.id, item.quantity - 1, item.size)
                  }
                  className="h-10 w-10"
                  aria-label={`Decrease ${product.name} quantity`}
                >
                  −
                </button>
                <span className="min-w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() =>
                    updateQuantity(product.id, item.quantity + 1, item.size)
                  }
                  className="h-10 w-10"
                  aria-label={`Increase ${product.name} quantity`}
                >
                  +
                </button>
              </div>
              <p className="mt-3 font-semibold">
                Tk {(product.price * item.quantity).toLocaleString()}.00
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="ml-auto mt-8 max-w-sm space-y-5">
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>Tk {subtotal.toLocaleString()}.00</span>
        </div>
        <button
          onClick={checkout}
          data-agni-id="cart.checkout"
          className="w-full bg-black py-4 font-semibold text-white"
        >
          Proceed to Checkout
        </button>
      </div>
    </main>
  );
}
