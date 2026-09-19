package com.agroloop.service;

import com.agroloop.dto.ProductFormRequest;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;

import java.util.List;

/**
 * Service contract for managing farmer produce listings and active marketplace catalog items.
 * Enforces strict farmer ownership checks on all mutating operations.
 */
public interface ProductService {

    Product createProduct(String farmerEmail, ProductFormRequest form);

    Product updateProduct(Long productId, String farmerEmail, ProductFormRequest form);

    void restockProduct(Long productId, String farmerEmail, int additionalStock);

    void toggleProductStatus(Long productId, String farmerEmail);

    Product getProductById(Long productId);

    List<Product> getFarmerProducts(String farmerEmail);

    List<Product> getActiveCatalogProducts(ProductCategory category, String searchKeyword);
}
