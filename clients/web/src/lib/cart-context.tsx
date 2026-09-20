"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ProductApiResponse } from "@agroloop/api-types";
import { webApiClient } from "./api";

/**
 * Invariant: Client storage strictly stores only productId and quantity.
 * Prices, stock levels, and farmer data are NEVER trusted or stored in localStorage.
 */
export interface LocalCartItem {
  productId: number;
  quantity: number;
}

export interface HydratedCartItem extends LocalCartItem {
  product?: ProductApiResponse;
  isLoading: boolean;
  isStale?: boolean;
}

export interface CartContextType {
  items: LocalCartItem[];
  hydratedItems: HydratedCartItem[];
  addItem: (productId: number, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  estimatedTotalTokens: number;
  isHydrating: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = "agroloop_cart_items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([]);
  const [hydratedItems, setHydratedItems] = useState<HydratedCartItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(false);

  // 1. Restore local cart on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly sanitize to only productId and quantity
          const sanitized: LocalCartItem[] = parsed
            .filter((i) => typeof i?.productId === "number" && typeof i?.quantity === "number")
            .map((i) => ({ productId: Number(i.productId), quantity: Math.max(1, Math.floor(i.quantity)) }));
          setItems(sanitized);
        }
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  // 2. Persist ONLY productId and quantity whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage error
    }
  }, [items]);

  // 3. Hydrate live server state for products
  const hydrateItems = useCallback(async (currentItems: LocalCartItem[]) => {
    if (currentItems.length === 0) {
      setHydratedItems([]);
      return;
    }

    setIsHydrating(true);
    try {
      const results = await Promise.all(
        currentItems.map(async (item) => {
          try {
            const product = await webApiClient.marketplace.getProduct(item.productId);
            return {
              ...item,
              product,
              isLoading: false,
            };
          } catch {
            return {
              ...item,
              isLoading: false,
              isStale: true,
            };
          }
        })
      );
      setHydratedItems(results);
    } finally {
      setIsHydrating(false);
    }
  }, []);

  useEffect(() => {
    hydrateItems(items);
  }, [items, hydrateItems]);

  const addItem = (productId: number, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { productId, quantity }];
    });
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setHydratedItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Provisional UX calculation only. Server is authoritative at checkout!
  const estimatedTotalTokens = hydratedItems.reduce((sum, item) => {
    const price = item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        hydratedItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        estimatedTotalTokens,
        isHydrating,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
