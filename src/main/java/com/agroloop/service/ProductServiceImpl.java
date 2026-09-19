package com.agroloop.service;

import com.agroloop.dto.ProductFormRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.service.storage.FileStorageService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final FarmerRepository farmerRepository;
    private final FileStorageService fileStorageService;

    public ProductServiceImpl(
            ProductRepository productRepository,
            FarmerRepository farmerRepository,
            FileStorageService fileStorageService
    ) {
        this.productRepository = Objects.requireNonNull(productRepository, "ProductRepository cannot be null");
        this.farmerRepository = Objects.requireNonNull(farmerRepository, "FarmerRepository cannot be null");
        this.fileStorageService = Objects.requireNonNull(fileStorageService, "FileStorageService cannot be null");
    }

    @Override
    @Transactional
    public Product createProduct(String farmerEmail, ProductFormRequest form) {
        Objects.requireNonNull(form, "ProductFormRequest cannot be null");
        Farmer farmer = getFarmerByEmail(farmerEmail);

        String imagePath = fileStorageService.storeFile(form.getImage(), "products");

        Product product = new Product(
                farmer,
                form.getName(),
                form.getDescription(),
                form.getCategory(),
                form.getUnit(),
                form.getPriceInTokens(),
                form.getStock(),
                imagePath
        );

        return productRepository.save(product);
    }

    @Override
    @Transactional
    public Product updateProduct(Long productId, String farmerEmail, ProductFormRequest form) {
        Objects.requireNonNull(form, "ProductFormRequest cannot be null");
        Farmer farmer = getFarmerByEmail(farmerEmail);
        Product product = getProductAndVerifyOwnership(productId, farmer);

        String imagePath = product.getImageUrl();
        if (form.getImage() != null && !form.getImage().isEmpty()) {
            imagePath = fileStorageService.storeFile(form.getImage(), "products");
        }

        product.updateDetails(
                form.getName(),
                form.getDescription(),
                form.getCategory(),
                form.getUnit(),
                form.getPriceInTokens(),
                imagePath
        );

        return productRepository.save(product);
    }

    @Override
    @Transactional
    public void restockProduct(Long productId, String farmerEmail, int additionalStock) {
        Farmer farmer = getFarmerByEmail(farmerEmail);
        Product product = getProductAndVerifyOwnership(productId, farmer);

        product.restock(additionalStock);
        productRepository.save(product);
    }

    @Override
    @Transactional
    public void toggleProductStatus(Long productId, String farmerEmail) {
        Farmer farmer = getFarmerByEmail(farmerEmail);
        Product product = getProductAndVerifyOwnership(productId, farmer);

        if (product.isActive()) {
            product.deactivate();
        } else {
            product.activate();
        }

        productRepository.save(product);
    }

    @Override
    public Product getProductById(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));
    }

    @Override
    public List<Product> getFarmerProducts(String farmerEmail) {
        Farmer farmer = getFarmerByEmail(farmerEmail);
        return productRepository.findByFarmerOrderByCreatedAtDesc(farmer);
    }

    @Override
    public List<Product> getActiveCatalogProducts(ProductCategory category, String searchKeyword) {
        boolean hasCategory = category != null;
        boolean hasKeyword = searchKeyword != null && !searchKeyword.trim().isBlank();

        if (hasCategory && hasKeyword) {
            return productRepository.findByCategoryAndNameContainingIgnoreCaseAndActiveTrueOrderByCreatedAtDesc(
                    category, searchKeyword.trim()
            );
        } else if (hasCategory) {
            return productRepository.findByCategoryAndActiveTrueOrderByCreatedAtDesc(category);
        } else if (hasKeyword) {
            return productRepository.findByNameContainingIgnoreCaseAndActiveTrueOrderByCreatedAtDesc(
                    searchKeyword.trim()
            );
        } else {
            return productRepository.findAllByActiveTrueOrderByCreatedAtDesc();
        }
    }

    // --- Helper Validation Methods ---

    private Farmer getFarmerByEmail(String farmerEmail) {
        return farmerRepository.findByEmail(farmerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Farmer not found with email: " + farmerEmail));
    }

    private Product getProductAndVerifyOwnership(Long productId, Farmer farmer) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + productId));

        if (!Objects.equals(product.getFarmer().getId(), farmer.getId())) {
            throw new AccessDeniedException(
                    "Unauthorized: Farmer does not own product with ID " + productId
            );
        }
        return product;
    }
}
