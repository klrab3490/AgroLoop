# Module 06: Sustainable Marketplace & Commerce

[← Back to Master Documentation Hub](../INDEX.md)

---

## 1. Overview & Concept

In **Phase 6: Marketplace**, farmers who enriched their soil using collected compost list farm-fresh produce, fruits, vegetables, flowers, and compost bags for sale. Households redeem their earned **EcoTokens** to purchase these goods.

---

## 2. Object-Oriented Principles in this Module

### Encapsulation
- `Product` encapsulates name, description, unit price in EcoTokens, stock quantity, and active listing state:
  - `deductStock(int quantity)`: Enforces positive inventory checks and throws `InsufficientStockException` on exhaustion.
  - `restock(int quantity)`: Adds available units.
- `Order` encapsulates purchase items, buyer (`Household`), total cost, and fulfillment status.

### Abstraction
- `MarketplaceService` coordinates:
  - Household token deduction (`household.spendTokens(totalCost)`).
  - Product stock reduction (`product.deductStock(qty)`).
  - Atomic database commit under Spring `@Transactional(isolation = Isolation.REPEATABLE_READ)`.

---

## 3. Core Class Design

```java
public class Product {
    private Long id;
    private Farmer farmer;
    private String name;
    private BigDecimal priceInTokens;
    private int stock;
    
    public void deductStock(int quantity) {
        if (quantity > this.stock) {
            throw new InsufficientStockException("Not enough stock available");
        }
        this.stock -= quantity;
    }
}
```

---

[← Back to Master Documentation Hub](../INDEX.md)
