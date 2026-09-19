package com.agroloop.exception;

/**
 * Thrown when a marketplace checkout or inventory mutation requests more product units
 * than currently available in stock.
 */
public class InsufficientStockException extends RuntimeException {

    private final Long productId;
    private final int requestedQuantity;
    private final int availableStock;

    public InsufficientStockException(String message) {
        super(message);
        this.productId = null;
        this.requestedQuantity = 0;
        this.availableStock = 0;
    }

    public InsufficientStockException(Long productId, int requestedQuantity, int availableStock) {
        super(String.format(
                "Insufficient stock for product ID %d: requested %d units, but only %d units available",
                productId, requestedQuantity, availableStock
        ));
        this.productId = productId;
        this.requestedQuantity = requestedQuantity;
        this.availableStock = availableStock;
    }

    public Long getProductId() {
        return productId;
    }

    public int getRequestedQuantity() {
        return requestedQuantity;
    }

    public int getAvailableStock() {
        return availableStock;
    }
}
