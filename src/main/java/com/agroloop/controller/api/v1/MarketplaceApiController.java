package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.response.PageApiResponse;
import com.agroloop.dto.api.v1.response.ProductApiResponse;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceApiController {

    private final ProductService productService;

    public MarketplaceApiController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    public ResponseEntity<PageApiResponse<ProductApiResponse>> listProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        ProductCategory cat = null;
        if (category != null && !category.isBlank()) {
            try {
                cat = ProductCategory.valueOf(category.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // invalid category returns empty or all
            }
        }

        List<Product> products = productService.getActiveCatalogProducts(cat, keyword);
        List<ProductApiResponse> dtos = products.stream().map(ProductApiResponse::from).toList();

        int total = dtos.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<ProductApiResponse> paged = dtos.subList(fromIndex, toIndex);

        return ResponseEntity.ok(PageApiResponse.of(paged, page, size, total));
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<ProductApiResponse> getProduct(@PathVariable Long id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ProductApiResponse.from(product));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Map<String, String>>> listCategories() {
        List<Map<String, String>> categories = Arrays.stream(ProductCategory.values())
                .map(cat -> Map.of(
                        "name", cat.name(),
                        "displayName", cat.getDisplayName(),
                        "description", cat.getDescription()
                ))
                .toList();
        return ResponseEntity.ok(categories);
    }
}
