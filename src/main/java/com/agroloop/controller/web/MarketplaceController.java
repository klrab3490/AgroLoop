package com.agroloop.controller.web;

import com.agroloop.dto.CartDto;
import com.agroloop.dto.CheckoutRequest;
import com.agroloop.exception.InsufficientStockException;
import com.agroloop.exception.InsufficientTokensException;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.service.CartService;
import com.agroloop.service.MarketplaceService;
import com.agroloop.service.ProductService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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

@Controller
@RequestMapping("/marketplace")
public class MarketplaceController {

    private final ProductService productService;
    private final CartService cartService;
    private final MarketplaceService marketplaceService;
    private final HouseholdRepository householdRepository;

    public MarketplaceController(
            ProductService productService,
            CartService cartService,
            MarketplaceService marketplaceService,
            HouseholdRepository householdRepository
    ) {
        this.productService = productService;
        this.cartService = cartService;
        this.marketplaceService = marketplaceService;
        this.householdRepository = householdRepository;
    }

    /**
     * Browse marketplace catalog with optional category and search filters.
     */
    @GetMapping
    public String catalog(
            @RequestParam(name = "category", required = false) ProductCategory category,
            @RequestParam(name = "search", required = false) String search,
            Authentication authentication,
            HttpSession session,
            Model model
    ) {
        List<Product> products = productService.getActiveCatalogProducts(category, search);
        model.addAttribute("products", products);
        model.addAttribute("categories", ProductCategory.values());
        model.addAttribute("selectedCategory", category);
        model.addAttribute("search", search);

        CartDto cart = cartService.getCart(session);
        model.addAttribute("cart", cart);

        if (authentication != null && authentication.isAuthenticated()) {
            householdRepository.findByEmail(authentication.getName()).ifPresent(household -> {
                model.addAttribute("household", household);
                model.addAttribute("tokenBalance", household.getTokenBalance());
            });
        }

        return "marketplace/index";
    }

    /**
     * Single product details view.
     */
    @GetMapping("/products/{id}")
    public String productDetails(
            @PathVariable("id") Long id,
            Authentication authentication,
            HttpSession session,
            Model model
    ) {
        Product product = productService.getProductById(id);
        model.addAttribute("product", product);

        CartDto cart = cartService.getCart(session);
        model.addAttribute("cart", cart);

        if (authentication != null && authentication.isAuthenticated()) {
            householdRepository.findByEmail(authentication.getName()).ifPresent(household -> {
                model.addAttribute("tokenBalance", household.getTokenBalance());
            });
        }

        return "marketplace/details";
    }

    /**
     * View shopping cart.
     */
    @GetMapping("/cart")
    public String viewCart(
            Authentication authentication,
            HttpSession session,
            Model model
    ) {
        CartDto cart = cartService.getCart(session);
        model.addAttribute("cart", cart);

        if (authentication != null && authentication.isAuthenticated()) {
            householdRepository.findByEmail(authentication.getName()).ifPresent(household -> {
                model.addAttribute("household", household);
                model.addAttribute("tokenBalance", household.getTokenBalance());
                model.addAttribute("hasSufficientTokens", household.getTokenBalance().compareTo(cart.getTotalTokens()) >= 0);
            });
        }

        return "marketplace/cart";
    }

    /**
     * Add product to shopping cart.
     */
    @PostMapping("/cart/add")
    public String addToCart(
            @RequestParam("productId") Long productId,
            @RequestParam(name = "quantity", defaultValue = "1") int quantity,
            HttpSession session,
            RedirectAttributes redirectAttributes
    ) {
        try {
            cartService.addToCart(session, productId, quantity);
            redirectAttributes.addFlashAttribute("successMessage", "Item added to cart!");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/marketplace/cart";
    }

    /**
     * Update quantity of a cart item.
     */
    @PostMapping("/cart/update")
    public String updateCartQuantity(
            @RequestParam("productId") Long productId,
            @RequestParam("quantity") int quantity,
            HttpSession session,
            RedirectAttributes redirectAttributes
    ) {
        try {
            cartService.updateQuantity(session, productId, quantity);
            redirectAttributes.addFlashAttribute("successMessage", "Cart updated successfully.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/marketplace/cart";
    }

    /**
     * Remove item from cart.
     */
    @PostMapping("/cart/remove")
    public String removeFromCart(
            @RequestParam("productId") Long productId,
            HttpSession session,
            RedirectAttributes redirectAttributes
    ) {
        cartService.removeFromCart(session, productId);
        redirectAttributes.addFlashAttribute("successMessage", "Item removed from cart.");
        return "redirect:/marketplace/cart";
    }

    /**
     * Render checkout preview form.
     */
    @GetMapping("/checkout")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String checkoutForm(
            Authentication authentication,
            HttpSession session,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        CartDto cart = cartService.getCart(session);
        if (cart.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Your cart is empty. Add products before checkout.");
            return "redirect:/marketplace";
        }

        Household household = householdRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated household not found"));

        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setDeliveryAddress(household.getAddress());

        model.addAttribute("cart", cart);
        model.addAttribute("household", household);
        model.addAttribute("tokenBalance", household.getTokenBalance());
        model.addAttribute("checkoutRequest", checkoutRequest);
        model.addAttribute("hasSufficientTokens", household.getTokenBalance().compareTo(cart.getTotalTokens()) >= 0);

        return "marketplace/checkout";
    }

    /**
     * Process checkout order.
     * Note: Transactional boundary is strictly inside marketplaceService.checkout(...).
     * The cart is cleared post-commit upon successful return.
     */
    @PostMapping("/checkout")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String processCheckout(
            @Valid @ModelAttribute("checkoutRequest") CheckoutRequest checkoutRequest,
            BindingResult bindingResult,
            Authentication authentication,
            HttpSession session,
            Model model,
            RedirectAttributes redirectAttributes
    ) {
        CartDto cart = cartService.getCart(session);
        if (cart.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Your cart is empty.");
            return "redirect:/marketplace";
        }

        Household household = householdRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated household not found"));

        if (bindingResult.hasErrors()) {
            model.addAttribute("cart", cart);
            model.addAttribute("household", household);
            model.addAttribute("tokenBalance", household.getTokenBalance());
            model.addAttribute("hasSufficientTokens", household.getTokenBalance().compareTo(cart.getTotalTokens()) >= 0);
            return "marketplace/checkout";
        }

        try {
            // Group cart items by farmer so different farmers receive separate orders,
            // while items from the same farmer are grouped into one single order.
            java.util.Map<String, java.util.List<com.agroloop.dto.CartItemDto>> itemsByFarmer = cart.getItems().stream()
                    .collect(java.util.stream.Collectors.groupingBy(item ->
                            item.getFarmerName() != null && !item.getFarmerName().isBlank()
                                    ? item.getFarmerName()
                                    : "Unknown Farmer"
                    ));

            Order lastOrder = null;
            for (java.util.List<com.agroloop.dto.CartItemDto> farmerItems : itemsByFarmer.values()) {
                CartDto subCart = new CartDto(farmerItems);
                lastOrder = marketplaceService.checkout(authentication.getName(), subCart, checkoutRequest);
            }

            // Clear session cart strictly upon successful return from the checkout transaction
            cartService.clearCart(session);

            if (itemsByFarmer.size() > 1) {
                redirectAttributes.addFlashAttribute("successMessage",
                        itemsByFarmer.size() + " separate orders placed across your selected producers!");
                return "redirect:/marketplace/orders?success=true";
            } else if (lastOrder != null) {
                redirectAttributes.addFlashAttribute("successMessage", "Order #" + lastOrder.getId() + " placed successfully!");
                return "redirect:/marketplace/orders/" + lastOrder.getId() + "?success=true";
            }
            return "redirect:/marketplace/orders";

        } catch (InsufficientStockException | InsufficientTokensException | IllegalStateException ex) {
            model.addAttribute("cart", cart);
            model.addAttribute("household", household);
            model.addAttribute("tokenBalance", household.getTokenBalance());
            model.addAttribute("errorMessage", ex.getMessage());
            model.addAttribute("hasSufficientTokens", household.getTokenBalance().compareTo(cart.getTotalTokens()) >= 0);
            return "marketplace/checkout";
        } catch (Exception ex) {
            model.addAttribute("cart", cart);
            model.addAttribute("household", household);
            model.addAttribute("tokenBalance", household.getTokenBalance());
            model.addAttribute("errorMessage", "Checkout failed: " + ex.getMessage());
            model.addAttribute("hasSufficientTokens", household.getTokenBalance().compareTo(cart.getTotalTokens()) >= 0);
            return "marketplace/checkout";
        }
    }

    /**
     * Household order history view.
     */
    @GetMapping("/orders")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String orderHistory(
            Authentication authentication,
            Model model
    ) {
        List<Order> orders = marketplaceService.getHouseholdOrders(authentication.getName());
        model.addAttribute("orders", orders);

        householdRepository.findByEmail(authentication.getName()).ifPresent(household -> {
            model.addAttribute("household", household);
            model.addAttribute("tokenBalance", household.getTokenBalance());
        });

        return "marketplace/orders";
    }

    /**
     * Single order confirmation and receipt view.
     */
    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('HOUSEHOLD', 'FARMER', 'ADMIN')")
    public String orderDetails(
            @PathVariable("id") Long id,
            @RequestParam(name = "success", defaultValue = "false") boolean success,
            Authentication authentication,
            Model model
    ) {
        Order order = marketplaceService.getOrderById(id, authentication.getName());
        model.addAttribute("order", order);
        model.addAttribute("isNewOrder", success);
        return "marketplace/order_details";
    }

    /**
     * Household cancels order and receives atomic refund.
     */
    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String cancelOrder(
            @PathVariable("id") Long id,
            @RequestParam("reason") String reason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            marketplaceService.cancelHouseholdOrder(id, authentication.getName(), reason);
            redirectAttributes.addFlashAttribute("successMessage", "Order #" + id + " has been cancelled and refunded successfully.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to cancel order: " + ex.getMessage());
        }
        return "redirect:/marketplace/orders/" + id;
    }

    /**
     * Household files a dispute on an order.
     */
    @PostMapping("/orders/{id}/dispute")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String disputeOrder(
            @PathVariable("id") Long id,
            @RequestParam("disputeReason") String disputeReason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            marketplaceService.disputeOrderAsHousehold(id, authentication.getName(), disputeReason);
            redirectAttributes.addFlashAttribute("successMessage", "Dispute submitted successfully for Order #" + id + ".");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to submit dispute: " + ex.getMessage());
        }
        return "redirect:/marketplace/orders/" + id;
    }
}
