"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: number;
  size?: number;
  quantity: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (productId: number, size?: number) => void;
  removeFromCart: (productId: number, size?: number) => void;
  updateQuantity: (productId: number, quantity: number, size?: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "agentic-ecommerce-cart";
const CartContext = createContext<CartContextType | undefined>(undefined);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.productId === "number" &&
    typeof item.quantity === "number" &&
    item.quantity > 0 &&
    (item.size === undefined || typeof item.size === "number")
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedCart = localStorage.getItem(STORAGE_KEY);
        const parsedCart: unknown = storedCart ? JSON.parse(storedCart) : [];

        if (Array.isArray(parsedCart)) {
          setCartItems(parsedCart.filter(isCartItem));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function changeCart(update: (items: CartItem[]) => CartItem[]) {
    setCartItems((currentItems) => {
      const nextItems = update(currentItems);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  }

  function addToCart(productId: number, size?: number) {
    changeCart((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === productId && item.size === size,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { productId, size, quantity: 1 }];
    });
  }

  function removeFromCart(productId: number, size?: number) {
    changeCart((currentItems) =>
      currentItems.filter(
        (item) => !(item.productId === productId && item.size === size),
      ),
    );
  }

  function updateQuantity(productId: number, quantity: number, size?: number) {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    changeCart((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId && item.size === size
          ? { ...item, quantity }
          : item,
      ),
    );
  }

  function clearCart() {
    changeCart(() => []);
  }

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
