package com.agroloop.controller;

import com.agroloop.dto.ProductFormRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.service.MarketplaceService;
import com.agroloop.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.Objects;

@Controller
@RequestMapping("/farmer/products")
@PreAuthorize("hasRole('FARMER')")
public class FarmerProductController {

    private final ProductService productService;
    private final FarmerRepository farmerRepository;
    private final MarketplaceService marketplaceService;

    public FarmerProductController(
            ProductService productService,
            FarmerRepository farmerRepository,
            MarketplaceService marketplaceService
    ) {
        this.productService = productService;
        this.farmerRepository = farmerRepository;
        this.marketplaceService = marketplaceService;
    }

    /**
     * List all products belonging to the authenticated farmer.
     */
    @GetMapping
    public String listProducts(
            Authentication authentication,
            Model model
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        List<Product> products = productService.getFarmerProducts(farmer.getEmail());
        model.addAttribute("farmer", farmer);
        model.addAttribute("products", products);
        return "farmer/products";
    }

    /**
     * Form to create a new produce listing.
     */
    @GetMapping("/new")
    public String newProductForm(
            Authentication authentication,
            Model model
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        model.addAttribute("farmer", farmer);
        model.addAttribute("productForm", new ProductFormRequest());
        model.addAttribute("categories", ProductCategory.values());
        return "farmer/product_form";
    }

    /**
     * Submit new product listing with optional image upload.
     */
    @PostMapping("/new")
    public String createProduct(
            @Valid @ModelAttribute("productForm") ProductFormRequest form,
            BindingResult bindingResult,
            Authentication authentication,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);

        if (bindingResult.hasErrors()) {
            model.addAttribute("farmer", farmer);
            model.addAttribute("categories", ProductCategory.values());
            return "farmer/product_form";
        }

        try {
            Product product = productService.createProduct(farmer.getEmail(), form);
            redirectAttributes.addFlashAttribute("successMessage", "Product '" + product.getName() + "' listed successfully!");
            return "redirect:/farmer/products";
        } catch (Exception ex) {
            model.addAttribute("farmer", farmer);
            model.addAttribute("categories", ProductCategory.values());
            model.addAttribute("errorMessage", "Failed to list product: " + ex.getMessage());
            return "farmer/product_form";
        }
    }

    /**
     * Form to edit an existing product.
     */
    @GetMapping("/{id}/edit")
    public String editProductForm(
            @PathVariable("id") Long id,
            Authentication authentication,
            Model model
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        Product product = productService.getProductById(id);
        verifyFarmerOwnership(product, farmer);

        ProductFormRequest form = new ProductFormRequest(
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getUnit(),
                product.getPriceInTokens(),
                product.getStock()
        );

        model.addAttribute("farmer", farmer);
        model.addAttribute("product", product);
        model.addAttribute("productForm", form);
        model.addAttribute("categories", ProductCategory.values());
        model.addAttribute("isEdit", true);

        return "farmer/product_form";
    }

    /**
     * Update an existing product listing.
     */
    @PostMapping("/{id}/edit")
    public String updateProduct(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute("productForm") ProductFormRequest form,
            BindingResult bindingResult,
            Authentication authentication,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        Product product = productService.getProductById(id);
        verifyFarmerOwnership(product, farmer);

        if (bindingResult.hasErrors()) {
            model.addAttribute("farmer", farmer);
            model.addAttribute("product", product);
            model.addAttribute("categories", ProductCategory.values());
            model.addAttribute("isEdit", true);
            return "farmer/product_form";
        }

        try {
            productService.updateProduct(id, farmer.getEmail(), form);
            redirectAttributes.addFlashAttribute("successMessage", "Product updated successfully!");
            return "redirect:/farmer/products";
        } catch (Exception ex) {
            model.addAttribute("farmer", farmer);
            model.addAttribute("product", product);
            model.addAttribute("categories", ProductCategory.values());
            model.addAttribute("isEdit", true);
            model.addAttribute("errorMessage", "Failed to update product: " + ex.getMessage());
            return "farmer/product_form";
        }
    }

    /**
     * Restock inventory units.
     */
    @PostMapping("/{id}/restock")
    public String restock(
            @PathVariable("id") Long id,
            @RequestParam("additionalStock") int additionalStock,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        Product product = productService.getProductById(id);
        verifyFarmerOwnership(product, farmer);

        try {
            productService.restockProduct(id, farmer.getEmail(), additionalStock);
            redirectAttributes.addFlashAttribute("successMessage", "Added " + additionalStock + " units to stock.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to restock: " + ex.getMessage());
        }
        return "redirect:/farmer/products";
    }

    /**
     * Toggle active/inactive listing status.
     */
    @PostMapping("/{id}/toggle")
    public String toggleStatus(
            @PathVariable("id") Long id,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        Product product = productService.getProductById(id);
        verifyFarmerOwnership(product, farmer);

        try {
            productService.toggleProductStatus(id, farmer.getEmail());
            redirectAttributes.addFlashAttribute("successMessage", "Product status toggled successfully.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to toggle status: " + ex.getMessage());
        }
        return "redirect:/farmer/products";
    }

    /**
     * View orders containing this farmer's produce.
     */
    @GetMapping("/orders")
    public String viewFarmerOrders(
            Authentication authentication,
            Model model
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        List<Order> orders = marketplaceService.getFarmerOrders(farmer.getEmail());
        model.addAttribute("farmer", farmer);
        model.addAttribute("orders", orders);
        return "farmer/orders";
    }

    /**
     * Participating farmer raises a dispute on an order.
     */
    @PostMapping("/orders/{id}/dispute")
    public String disputeOrder(
            @PathVariable("id") Long id,
            @RequestParam("disputeReason") String disputeReason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            marketplaceService.disputeOrderAsFarmer(id, authentication.getName(), disputeReason);
            redirectAttributes.addFlashAttribute("successMessage", "Dispute raised successfully on Order #" + id);
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to dispute order: " + ex.getMessage());
        }
        return "redirect:/farmer/products/orders";
    }

    private Farmer getAuthenticatedFarmer(Authentication authentication) {
        return farmerRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated farmer not found"));
    }

    private void verifyFarmerOwnership(Product product, Farmer farmer) {
        if (!Objects.equals(product.getFarmer().getId(), farmer.getId())) {
            throw new AccessDeniedException("Unauthorized: You do not own product #" + product.getId());
        }
    }
}
