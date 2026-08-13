"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type AddToCartButtonProps = {
  productId: number;
  sizes?: number[];
};

export default function AddToCartButton({ productId, sizes }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [message, setMessage] = useState("");
  // Counts presses so the Agni bridge can tell a fresh outcome from a stale one.
  const [attempts, setAttempts] = useState(0);

  function handleAddToCart() {
    setAttempts((count) => count + 1);

    if (sizes?.length && selectedSize === undefined) {
      setMessage("Please select a size.");
      return;
    }

    addToCart(productId, selectedSize);
    setMessage("Added to cart.");
  }

  return (
    <div>
      {sizes?.length ? (
        <fieldset className="mb-8">
          <legend className="mb-3 text-sm font-semibold">Size</legend>
          <div className="flex flex-wrap gap-3">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  setMessage("");
                }}
                aria-pressed={selectedSize === size}
                data-agni-size={size}
                className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm ${
                  selectedSize === size
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {message && (
        <p
          className={`mb-3 text-sm ${message.startsWith("Please") ? "text-red-600" : "text-green-700"}`}
          role="status"
          data-agni-id="product.message"
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleAddToCart}
        data-agni-id="product.addToCart"
        data-agni-attempts={attempts}
        className="w-full bg-black py-4 font-semibold text-white"
      >
        ADD TO CART
      </button>
    </div>
  );
}
