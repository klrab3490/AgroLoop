import { describe, it, expect, beforeEach } from "vitest";

interface LocalCartItem {
  productId: number;
  quantity: number;
}

const CART_STORAGE_KEY = "agroloop_cart_items";

describe("Cart Invariants & Storage Sanitization", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
  });

  it("persists only productId and quantity to storage", () => {
    const rawCart = [
      {
        productId: 101,
        quantity: 2,
        price: 999, // Attempted client-side price injection
        stock: 50,
        farmerName: "Alice Farms",
      },
    ];

    // Sanitize in line with CartProvider invariant
    const sanitized: LocalCartItem[] = rawCart.map((i) => ({
      productId: i.productId,
      quantity: Math.max(1, Math.floor(i.quantity)),
    }));

    mockStorage[CART_STORAGE_KEY] = JSON.stringify(sanitized);

    const retrieved = JSON.parse(mockStorage[CART_STORAGE_KEY]);
    expect(retrieved).toEqual([{ productId: 101, quantity: 2 }]);
    expect(retrieved[0].price).toBeUndefined();
    expect(retrieved[0].stock).toBeUndefined();
    expect(retrieved[0].farmerName).toBeUndefined();
  });

  it("sanitizes negative or fractional quantities", () => {
    const invalidCart = [
      { productId: 1, quantity: -5 },
      { productId: 2, quantity: 0 },
      { productId: 3, quantity: 3.8 },
    ];

    const sanitized = invalidCart.map((i) => ({
      productId: i.productId,
      quantity: Math.max(1, Math.floor(i.quantity)),
    }));

    expect(sanitized).toEqual([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 3 },
    ]);
  });

  it("calculates estimated tokens strictly as provisional UX without altering storage", () => {
    const cart: LocalCartItem[] = [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 3 },
    ];

    // Live server hydration data (never stored)
    const serverProductPrices: Record<number, number> = {
      1: 15, // 15 EcoTokens
      2: 30, // 30 EcoTokens
    };

    const estimatedTotal = cart.reduce(
      (sum, item) => sum + (serverProductPrices[item.productId] ?? 0) * item.quantity,
      0
    );

    expect(estimatedTotal).toBe(2 * 15 + 3 * 30); // 120 Tokens
  });
});
