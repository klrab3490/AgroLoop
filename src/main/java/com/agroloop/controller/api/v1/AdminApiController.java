package com.agroloop.controller.api.v1;

import com.agroloop.dto.SolvencyMetricsDto;
import com.agroloop.dto.api.v1.request.CancelOrderApiRequest;
import com.agroloop.dto.api.v1.request.ResolveDisputeApiRequest;
import com.agroloop.dto.api.v1.request.TokenAdjustmentApiRequest;
import com.agroloop.dto.api.v1.request.UserStatusApiRequest;
import com.agroloop.dto.api.v1.response.EcoTokenTransactionApiResponse;
import com.agroloop.dto.api.v1.response.HouseholdBalanceResponse;
import com.agroloop.dto.api.v1.response.OrderApiResponse;
import com.agroloop.dto.api.v1.response.PageApiResponse;
import com.agroloop.dto.api.v1.response.UserApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.User;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.security.authorization.OrderSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.AdminGovernanceService;
import com.agroloop.service.MarketplaceService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import com.agroloop.dto.api.v1.request.ConvertUserToFarmerApiRequest;
import com.agroloop.dto.api.v1.request.CreateUserApiRequest;
import com.agroloop.dto.api.v1.request.UpdateUserRoleApiRequest;
import com.agroloop.dto.api.v1.response.FarmerApplicationApiResponse;
import com.agroloop.model.FarmerApplication;
import com.agroloop.service.UserService;
import org.springframework.http.HttpStatus;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminApiController {

    private final AdminGovernanceService adminGovernanceService;
    private final UserService userService;
    private final MarketplaceService marketplaceService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final IdempotencyService idempotencyService;
    private final OrderSecurityEvaluator orderSecurityEvaluator;
    private final com.agroloop.service.storage.StorageManager storageManager;

    public AdminApiController(
            AdminGovernanceService adminGovernanceService,
            UserService userService,
            MarketplaceService marketplaceService,
            OrderRepository orderRepository,
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            IdempotencyService idempotencyService,
            OrderSecurityEvaluator orderSecurityEvaluator,
            com.agroloop.service.storage.StorageManager storageManager
    ) {
        this.adminGovernanceService = adminGovernanceService;
        this.userService = userService;
        this.marketplaceService = marketplaceService;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.idempotencyService = idempotencyService;
        this.orderSecurityEvaluator = orderSecurityEvaluator;
        this.storageManager = storageManager;
    }

    @GetMapping("/orders")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<OrderApiResponse>> listOrders(@RequestParam(required = false) String status) {
        OrderStatus orderStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                orderStatus = OrderStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        List<Order> orders = adminGovernanceService.getAllOrders(orderStatus);
        return ResponseEntity.ok(orders.stream().map(OrderApiResponse::from).toList());
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<OrderApiResponse> cancelOrder(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CancelOrderApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for admin cancelling an order");
        }

        Long adminId = orderSecurityEvaluator.extractUserId(auth);
        String adminEmail = extractAdminEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(adminId);

        OrderApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/admin/orders/" + id + "/cancel",
                request,
                OrderApiResponse.class,
                () -> {
                    marketplaceService.adminCancelOrder(id, adminEmail, request.reason());
                    Order updated = orderRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
                    return OrderApiResponse.from(updated);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/dispute/resolve")
    public ResponseEntity<OrderApiResponse> resolveDispute(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody ResolveDisputeApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for resolving dispute");
        }

        Long adminId = orderSecurityEvaluator.extractUserId(auth);
        String adminEmail = extractAdminEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(adminId);
 
        OrderApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/admin/orders/" + id + "/dispute/resolve",
                request,
                OrderApiResponse.class,
                () -> {
                    marketplaceService.resolveDispute(id, adminEmail, request.resolution(), request.adminNotes());
                    Order updated = orderRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
                    return OrderApiResponse.from(updated);
                }
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserApiResponse>> listUsers() {
        List<User> users = adminGovernanceService.getAllUsers();
        return ResponseEntity.ok(users.stream().map(UserApiResponse::from).toList());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserApiResponse> getUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return ResponseEntity.ok(UserApiResponse.from(user));
    }

    @PostMapping("/users")
    public ResponseEntity<UserApiResponse> createUser(@Valid @RequestBody CreateUserApiRequest request) {
        User created = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserApiResponse.from(created));
    }

    @RequestMapping(value = "/users/{id}/role", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<UserApiResponse> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleApiRequest request,
            Authentication auth
    ) {
        String adminEmail = extractAdminEmail(auth);
        Long currentAdminId = orderSecurityEvaluator.extractUserId(auth);
        if (Objects.equals(id, currentAdminId) && request.role() != com.agroloop.model.Role.ROLE_ADMIN) {
            throw new IllegalStateException("Safety Guard: You cannot demote your own administrator account.");
        }
        User updated = userService.updateUserRole(
                id,
                request.role(),
                request.address(),
                request.farmName(),
                request.farmAddress(),
                request.notes(),
                adminEmail
        );
        return ResponseEntity.ok(UserApiResponse.from(updated));
    }

    @PostMapping("/users/{id}/status")
    public ResponseEntity<UserApiResponse> setUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusApiRequest request,
            Authentication auth
    ) {
        String adminEmail = extractAdminEmail(auth);
        boolean active = request.isEnabled();
        if (active) {
            adminGovernanceService.enableUser(id, adminEmail);
        } else {
            adminGovernanceService.disableUser(id, adminEmail);
        }
        User updated = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return ResponseEntity.ok(UserApiResponse.from(updated));
    }

    @PostMapping("/users/{id}/token-adjustment")
    public ResponseEntity<HouseholdBalanceResponse> adjustTokens(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TokenAdjustmentApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for token adjustment");
        }

        Long adminId = orderSecurityEvaluator.extractUserId(auth);
        String adminEmail = extractAdminEmail(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(adminId);

        HouseholdBalanceResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/admin/users/" + id + "/token-adjustment",
                request,
                HouseholdBalanceResponse.class,
                () -> {
                    adminGovernanceService.adjustTokens(id, request.amount(), request.direction(), request.reason(), adminEmail);
                    Household household = householdRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("Household not found: " + id));
                    return new HouseholdBalanceResponse(
                            household.getId(),
                            household.getTokenBalance(),
                            BigDecimal.ZERO,
                            household.getUpdatedAt()
                    );
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/users/{id}/convert-to-farmer")
    public ResponseEntity<UserApiResponse> convertUserToFarmer(
            @PathVariable Long id,
            @Valid @RequestBody ConvertUserToFarmerApiRequest request
    ) {
        User converted = userService.convertUserToFarmer(id, request.farmName(), request.farmAddress(), request.notes());
        return ResponseEntity.ok(UserApiResponse.from(converted));
    }

    @GetMapping("/farmer-applications")
    public ResponseEntity<List<FarmerApplicationApiResponse>> listPendingFarmerApplications() {
        List<FarmerApplication> applications = userService.getPendingFarmerApplications();
        return ResponseEntity.ok(applications.stream().map(FarmerApplicationApiResponse::from).toList());
    }

    @PostMapping("/farmer-applications/{id}/approve")
    public ResponseEntity<Map<String, String>> approveFarmerApplication(@PathVariable Long id) {
        userService.approveFarmerApplication(id);
        return ResponseEntity.ok(Map.of("message", "Farmer application approved successfully"));
    }

    @PostMapping("/farmer-applications/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectFarmerApplication(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = (body != null && body.containsKey("reason") && !body.get("reason").isBlank())
                ? body.get("reason")
                : "Administrative rejection";
        userService.rejectFarmerApplication(id, reason);
        return ResponseEntity.ok(Map.of("message", "Farmer application rejected successfully"));
    }

    @GetMapping("/solvency")
    public ResponseEntity<SolvencyMetricsDto> getSolvencyMetrics() {
        SolvencyMetricsDto metrics = adminGovernanceService.getPlatformSolvencyMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/ledger")
    public ResponseEntity<PageApiResponse<EcoTokenTransactionApiResponse>> getPlatformLedger(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<EcoTokenTransaction> ledgerPage = adminGovernanceService.getPlatformLedger(
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return ResponseEntity.ok(PageApiResponse.from(ledgerPage, EcoTokenTransactionApiResponse::from));
    }

    private String extractAdminEmail(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
        }
        return auth.getName();
    }

    @GetMapping("/storage/status")
    public ResponseEntity<com.agroloop.dto.api.v1.response.StorageDiagnosticsResponse> getStorageDiagnostics() {
        return ResponseEntity.ok(storageManager.getDiagnostics());
    }
}
