package com.agroloop.controller.web;

import com.agroloop.dto.DemoCredentials;
import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.model.DisputeResolution;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.FarmerApplication;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.Role;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.service.AdminGovernanceService;
import com.agroloop.service.MarketplaceService;
import com.agroloop.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Value("${agroloop.demo-mode:true}")
    private boolean demoMode;

    private final AdminGovernanceService adminGovernanceService;
    private final UserService userService;
    private final MarketplaceService marketplaceService;
    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;
    private final OrderRepository orderRepository;

    public AdminController(
            AdminGovernanceService adminGovernanceService,
            UserService userService,
            MarketplaceService marketplaceService,
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            OrderRepository orderRepository
    ) {
        this.adminGovernanceService = Objects.requireNonNull(adminGovernanceService, "AdminGovernanceService cannot be null");
        this.userService = Objects.requireNonNull(userService, "UserService cannot be null");
        this.marketplaceService = Objects.requireNonNull(marketplaceService, "MarketplaceService cannot be null");
        this.userRepository = Objects.requireNonNull(userRepository, "UserRepository cannot be null");
        this.householdRepository = Objects.requireNonNull(householdRepository, "HouseholdRepository cannot be null");
        this.farmerRepository = Objects.requireNonNull(farmerRepository, "FarmerRepository cannot be null");
        this.orderRepository = Objects.requireNonNull(orderRepository, "OrderRepository cannot be null");
    }

    /**
     * Admin Overview Dashboard: platform analytics, solvency, pending farmer applications.
     */
    @GetMapping("/dashboard")
    public String adminDashboard(Authentication authentication, Model model) {
        User admin = userRepository.findByEmail(authentication.getName()).orElse(null);
        List<FarmerApplication> pendingApps = userService.getPendingFarmerApplications();
        SolvencyMetricsDto solvencyMetrics = adminGovernanceService.getPlatformSolvencyMetrics();
        List<Order> disputedOrders = adminGovernanceService.getDisputedOrders();
        List<Order> recentOrders = adminGovernanceService.getRecentOrders(15);
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        List<User> adminUsers = users.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).toList();
        BigDecimal totalTokensInCirculation = (solvencyMetrics != null && solvencyMetrics.getTotalHouseholdBalances() != null)
                ? solvencyMetrics.getTotalHouseholdBalances()
                : BigDecimal.ZERO;

        model.addAttribute("user", admin);
        model.addAttribute("totalUsers", userRepository.count());
        model.addAttribute("totalHouseholds", householdRepository.count());
        model.addAttribute("totalFarmers", farmerRepository.count());
        model.addAttribute("totalOrders", orderRepository.count());
        model.addAttribute("disputedOrdersCount", disputedOrders.size());
        model.addAttribute("pendingApplications", pendingApps);
        model.addAttribute("solvencyMetrics", solvencyMetrics);
        model.addAttribute("users", users);
        model.addAttribute("directions", TransactionDirection.values());
        model.addAttribute("recentOrders", recentOrders);
        model.addAttribute("disputedOrders", disputedOrders);
        model.addAttribute("adminUsers", adminUsers);
        model.addAttribute("totalTokensInCirculation", totalTokensInCirculation);
        model.addAttribute("demoMode", demoMode);

        // Security Invariant: Demo credentials object is strictly added ONLY when demoMode is true
        if (demoMode) {
            model.addAttribute("demoCredentials", DemoCredentials.createDefault(null));
        }

        return "dashboard/admin";
    }

    /**
     * Moderate Farmer Application: Approve.
     */
    @PostMapping("/applications/{id}/approve")
    public String approveFarmerApplication(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        try {
            userService.approveFarmerApplication(id);
            redirectAttributes.addFlashAttribute("successMessage", "Farmer application #" + id + " has been approved.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to approve application: " + ex.getMessage());
        }
        return "redirect:/admin/dashboard";
    }

    /**
     * Moderate Farmer Application: Reject.
     */
    @PostMapping("/applications/{id}/reject")
    public String rejectFarmerApplication(
            @PathVariable("id") Long id,
            @RequestParam(value = "reason", defaultValue = "Application does not meet current verification criteria.") String reason,
            RedirectAttributes redirectAttributes
    ) {
        try {
            userService.rejectFarmerApplication(id, reason);
            redirectAttributes.addFlashAttribute("successMessage", "Farmer application #" + id + " has been rejected.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to reject application: " + ex.getMessage());
        }
        return "redirect:/admin/dashboard";
    }

    /**
     * User Management: list all users across roles with enable/disable states and token balances.
     */
    @GetMapping("/users")
    public String listUsers(Model model) {
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        model.addAttribute("users", users);
        model.addAttribute("directions", TransactionDirection.values());
        model.addAttribute("demoMode", demoMode);
        if (demoMode) {
            model.addAttribute("demoCredentials", DemoCredentials.createDefault(null));
        }
        return "admin/users";
    }

    /**
     * User Management: Enable user account.
     */
    @PostMapping("/users/{id}/enable")
    public String enableUser(
            @PathVariable("id") Long id,
            @RequestParam(value = "redirect", required = false) String redirectUrl,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            adminGovernanceService.enableUser(id, authentication.getName());
            redirectAttributes.addFlashAttribute("successMessage", "User #" + id + " enabled successfully.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to enable user: " + ex.getMessage());
        }
        return (redirectUrl != null && !redirectUrl.isBlank()) ? "redirect:" + redirectUrl : "redirect:/admin/users";
    }

    /**
     * User Management: Disable user account with concurrency-safe last-admin protection.
     */
    @PostMapping("/users/{id}/disable")
    public String disableUser(
            @PathVariable("id") Long id,
            @RequestParam(value = "redirect", required = false) String redirectUrl,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            adminGovernanceService.disableUser(id, authentication.getName());
            redirectAttributes.addFlashAttribute("successMessage", "User #" + id + " disabled successfully.");
        } catch (IllegalArgumentException | IllegalStateException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to disable user: " + ex.getMessage());
        }
        return (redirectUrl != null && !redirectUrl.isBlank()) ? "redirect:" + redirectUrl : "redirect:/admin/users";
    }

    /**
     * User Management: Admin token balance adjustment.
     */
    @PostMapping("/households/{id}/adjust-tokens")
    public String adjustTokens(
            @PathVariable("id") Long householdId,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam("direction") TransactionDirection direction,
            @RequestParam("reason") String reason,
            @RequestParam(value = "redirect", required = false) String redirectUrl,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            adminGovernanceService.adjustTokens(householdId, amount, direction, reason, authentication.getName());
            redirectAttributes.addFlashAttribute("successMessage",
                    String.format("Adjusted tokens for Household #%d: %s %s EcoTokens.", householdId, direction, amount));
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to adjust tokens: " + ex.getMessage());
        }
        return (redirectUrl != null && !redirectUrl.isBlank()) ? "redirect:" + redirectUrl : "redirect:/admin/users";
    }

    /**
     * Order Management: List all orders with status filtering.
     */
    @GetMapping("/orders")
    public String listOrders(
            @RequestParam(name = "status", required = false) OrderStatus status,
            Model model
    ) {
        List<Order> orders = adminGovernanceService.getAllOrders(status);
        model.addAttribute("orders", orders);
        model.addAttribute("selectedStatus", status);
        model.addAttribute("statuses", OrderStatus.values());
        model.addAttribute("disputeResolutions", DisputeResolution.values());
        return "admin/orders";
    }

    /**
     * Order Management: Admin order cancellation.
     */
    @PostMapping("/orders/{id}/cancel")
    public String cancelOrder(
            @PathVariable("id") Long orderId,
            @RequestParam("reason") String reason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            marketplaceService.adminCancelOrder(orderId, authentication.getName(), reason);
            redirectAttributes.addFlashAttribute("successMessage", "Order #" + orderId + " has been cancelled and refunded.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to cancel order: " + ex.getMessage());
        }
        return "redirect:/admin/orders";
    }

    /**
     * Order Management: Admin dispute resolution.
     */
    @PostMapping("/orders/{id}/resolve-dispute")
    public String resolveDispute(
            @PathVariable("id") Long orderId,
            @RequestParam("resolution") DisputeResolution resolution,
            @RequestParam("resolutionNotes") String resolutionNotes,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            marketplaceService.resolveDispute(orderId, authentication.getName(), resolution, resolutionNotes);
            redirectAttributes.addFlashAttribute("successMessage",
                    "Dispute on Order #" + orderId + " resolved with outcome: " + resolution.getDisplayName());
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to resolve dispute: " + ex.getMessage());
        }
        return "redirect:/admin/orders";
    }

    /**
     * Global Platform Ledger: Paginated financial audit trail with solvency metrics.
     */
    @GetMapping("/ledger")
    public String viewLedger(
            @PageableDefault(size = 25, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
            Model model
    ) {
        Page<EcoTokenTransaction> ledgerPage = adminGovernanceService.getPlatformLedger(pageable);
        SolvencyMetricsDto solvencyMetrics = adminGovernanceService.getPlatformSolvencyMetrics();

        model.addAttribute("ledgerPage", ledgerPage);
        model.addAttribute("solvencyMetrics", solvencyMetrics);
        return "admin/ledger";
    }
}
