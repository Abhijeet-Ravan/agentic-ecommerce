import Link from "next/link";

/**
 * Where the agent's job ends: it clicks "Proceed to Checkout" and the shopper
 * takes over for delivery and payment. No payment provider is wired up in this
 * proof of concept.
 */
export default function CheckoutPage() {
  return (
    <main
      className="mx-auto w-full max-w-3xl flex-1 px-6 py-16"
      data-agni-page="checkout"
    >
      <h1 className="text-3xl font-semibold">Checkout</h1>
      <p className="mt-3 text-gray-600">
        Your order is ready. Delivery details and payment are handled here — the
        shopping assistant stops at this point.
      </p>

      <div className="mt-10 rounded border border-dashed border-gray-300 p-10 text-center">
        <p className="font-semibold">Payment step</p>
        <p className="mt-2 text-sm text-gray-600">
          Connect a payment provider to complete this flow.
        </p>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/cart" className="underline">
          Back to cart
        </Link>
        <Link href="/products" className="underline">
          Keep shopping
        </Link>
      </div>
    </main>
  );
}
