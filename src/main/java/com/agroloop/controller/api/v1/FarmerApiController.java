package com.agroloop.controller.api.v1;

import com.agroloop.dto.ProductFormRequest;
import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.dto.api.v1.request.FarmerProductApiRequest;
import com.agroloop.dto.api.v1.request.SchedulePickupApiRequest;
import com.agroloop.dto.api.v1.request.VerifyWasteApiRequest;
import com.agroloop.dto.api.v1.response.OrderApiResponse;
import com.agroloop.dto.api.v1.response.PickupRequestApiResponse;
import com.agroloop.dto.api.v1.response.ProductApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.Farmer;
import com.agroloop.model.Order;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.Product;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.MarketplaceService;
import com.agroloop.service.MediaService;
import com.agroloop.service.PickupService;
import com.agroloop.service.ProductService;
import com.agroloop.dto.api.v1.request.CreateRouteApiRequest;
import com.agroloop.dto.api.v1.request.UpdateFarmerLocationApiRequest;
import com.agroloop.dto.api.v1.response.CollectionRouteApiResponse;
import com.agroloop.dto.api.v1.response.WasteMatchApiResponse;
import com.agroloop.model.CollectionRoute;
import com.agroloop.service.RouteService;
import com.agroloop.service.matching.WasteMatchResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/farmer")
@PreAuthorize("hasAuthority('ROLE_FARMER')")
public class FarmerApiController {

    private final PickupService pickupService;
    private final ProductService productService;
    private final MarketplaceService marketplaceService;
    private final FarmerRepository farmerRepository;
    private final MediaService mediaService;
    private final IdempotencyService idempotencyService;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;
    private final RouteService routeService;

    public FarmerApiController(
            PickupService pickupService,
            ProductService productService,
            MarketplaceService marketplaceService,
            FarmerRepository farmerRepository,
            MediaService mediaService,
            IdempotencyService idempotencyService,
            PickupSecurityEvaluator pickupSecurityEvaluator,
            RouteService routeService
    ) {
        this.pickupService = pickupService;
        this.productService = productService;
        this.marketplaceService = marketplaceService;
        this.farmerRepository = farmerRepository;
        this.mediaService = mediaService;
        this.idempotencyService = idempotencyService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
        this.routeService = routeService;
    }

    @GetMapping("/pickups/available")
    public ResponseEntity<List<PickupRequestApiResponse>> getAvailablePickups() {
        List<PickupRequest> pickups = pickupService.getAvailablePickups();
        return ResponseEntity.ok(pickups.stream().map(PickupRequestApiResponse::from).toList());
    }

    @PostMapping("/pickups/{id}/claim")
    @PreAuthorize("@pickupAuth.canClaimPickupAsFarmer(authentication, #id)")
    public ResponseEntity<PickupRequestApiResponse> claimPickup(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for claiming a pickup");
        }

        Farmer farmer = getAuthenticatedFarmer(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(farmer.getId());

        PickupRequestApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/farmer/pickups/" + id + "/claim",
                id,
                PickupRequestApiResponse.class,
                () -> {
                    PickupRequest claimed = pickupService.claimPickup(id, farmer.getId());
                    return PickupRequestApiResponse.from(claimed);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/pickups/{id}/schedule")
    @PreAuthorize("@pickupAuth.canSchedulePickupAsFarmer(authentication, #id)")
    public ResponseEntity<PickupRequestApiResponse> schedulePickup(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody SchedulePickupApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for scheduling a pickup");
        }

        Farmer farmer = getAuthenticatedFarmer(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(farmer.getId());

        PickupRequestApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/farmer/pickups/" + id + "/schedule",
                request,
                PickupRequestApiResponse.class,
                () -> {
                    SchedulePickupRequest serviceReq = new SchedulePickupRequest(request.scheduledTime());
                    PickupRequest scheduled = pickupService.schedulePickup(id, farmer.getId(), serviceReq);
                    return PickupRequestApiResponse.from(scheduled);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/pickups/{id}/collect")
    public ResponseEntity<PickupRequestApiResponse> collectPickup(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for collecting a pickup");
        }

        Farmer farmer = getAuthenticatedFarmer(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(farmer.getId());

        PickupRequestApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/farmer/pickups/" + id + "/collect",
                id,
                PickupRequestApiResponse.class,
                () -> {
                    PickupRequest collected = pickupService.collectPickup(id, farmer.getId());
                    return PickupRequestApiResponse.from(collected);
                }
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/pickups/{id}/verify")
    @PreAuthorize("@pickupAuth.canVerifyPickupAsFarmer(authentication, #id)")
    public ResponseEntity<PickupRequestApiResponse> verifyPickup(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody VerifyWasteApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for verifying a pickup");
        }

        Farmer farmer = getAuthenticatedFarmer(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(farmer.getId());

        PickupRequestApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/farmer/pickups/" + id + "/verify",
                request,
                PickupRequestApiResponse.class,
                () -> {
                    WasteVerificationRequest serviceReq = new WasteVerificationRequest(
                            request.verifiedWeight(),
                            request.qualityGrade(),
                            request.notes()
                    );
                    com.agroloop.model.WasteVerification verified = pickupService.verifyPickup(id, farmer.getId(), serviceReq);
                    return PickupRequestApiResponse.from(verified.getPickupRequest());
                }
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/products")
    public ResponseEntity<List<ProductApiResponse>> getProducts(Authentication auth) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        List<Product> products = productService.getFarmerProducts(farmer.getEmail());
        return ResponseEntity.ok(products.stream().map(ProductApiResponse::from).toList());
    }

    @PostMapping("/products")
    public ResponseEntity<ProductApiResponse> createProduct(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody FarmerProductApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for creating a product");
        }

        Farmer farmer = getAuthenticatedFarmer(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(farmer.getId());

        ProductApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/farmer/products",
                request,
                ProductApiResponse.class,
                () -> {
                    ProductFormRequest form = new ProductFormRequest(
                            request.name(),
                            request.description(),
                            request.category(),
                            request.unit(),
                            request.price(),
                            request.stock()
                    );
                    Product product = productService.createProduct(farmer.getEmail(), form);
                    if (request.mediaId() != null && !request.mediaId().isBlank()) {
                        mediaService.attachMedia(request.mediaId(), farmer.getId(), "products", product.getId());
                    }
                    return ProductApiResponse.from(product);
                }
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<ProductApiResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody FarmerProductApiRequest request,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        ProductFormRequest form = new ProductFormRequest(
                request.name(),
                request.description(),
                request.category(),
                request.unit(),
                request.price(),
                request.stock()
        );
        Product updated = productService.updateProduct(id, farmer.getEmail(), form);
        if (request.mediaId() != null && !request.mediaId().isBlank()) {
            mediaService.attachMedia(request.mediaId(), farmer.getId(), "products", updated.getId());
        }
        return ResponseEntity.ok(ProductApiResponse.from(updated));
    }

    @GetMapping("/orders")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<OrderApiResponse>> getOrders(Authentication auth) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        List<Order> orders = marketplaceService.getFarmerOrders(farmer.getEmail());
        return ResponseEntity.ok(orders.stream().map(OrderApiResponse::from).toList());
    }

    // --- Phase 9: Dynamic Matching & Collection Route APIs ---

    @GetMapping("/matching/recommendations")
    public ResponseEntity<List<WasteMatchApiResponse>> getPickupRecommendations(
            @RequestParam(value = "strategy", defaultValue = "COMPOSITE") String strategy,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        List<WasteMatchResult> matches = routeService.getPickupRecommendations(farmer.getId(), strategy);
        return ResponseEntity.ok(matches.stream().map(WasteMatchApiResponse::from).toList());
    }

    @PostMapping("/routes/optimize")
    public ResponseEntity<CollectionRouteApiResponse> createOptimizedRoute(
            @Valid @RequestBody CreateRouteApiRequest request,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        CollectionRoute route = routeService.createOptimizedRoute(
                farmer.getId(),
                request.routeDate(),
                request.pickupIds(),
                request.notes()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(CollectionRouteApiResponse.from(route));
    }

    @GetMapping("/routes/active")
    public ResponseEntity<List<CollectionRouteApiResponse>> getActiveRoutes(Authentication auth) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        List<CollectionRoute> routes = routeService.getActiveRoutes(farmer.getId());
        return ResponseEntity.ok(routes.stream().map(CollectionRouteApiResponse::from).toList());
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<CollectionRouteApiResponse> getRouteDetails(
            @PathVariable Long id,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        CollectionRoute route = routeService.getRouteDetails(id, farmer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Collection route not found with ID: " + id));
        return ResponseEntity.ok(CollectionRouteApiResponse.from(route));
    }

    @PostMapping("/routes/{id}/start")
    public ResponseEntity<CollectionRouteApiResponse> startRoute(
            @PathVariable Long id,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        CollectionRoute route = routeService.startRoute(id, farmer.getId());
        return ResponseEntity.ok(CollectionRouteApiResponse.from(route));
    }

    @PostMapping("/routes/{id}/stops/{stopId}/complete")
    public ResponseEntity<Void> completeStop(
            @PathVariable Long id,
            @PathVariable Long stopId,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        routeService.completeStop(id, stopId, farmer.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/routes/{id}/cancel")
    public ResponseEntity<Void> cancelRoute(
            @PathVariable Long id,
            @RequestParam(value = "reason", required = false) String reason,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        routeService.cancelRoute(id, farmer.getId(), reason);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/location")
    public ResponseEntity<Void> updateLocation(
            @Valid @RequestBody UpdateFarmerLocationApiRequest request,
            Authentication auth
    ) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        routeService.updateFarmerLocationAndCapacity(
                farmer.getId(),
                request.latitude(),
                request.longitude(),
                request.serviceRadiusKm(),
                request.maxDailyCapacityKg()
        );
        return ResponseEntity.noContent().build();
    }

    private Farmer getAuthenticatedFarmer(Authentication auth) {
        Long userId = pickupSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            throw new ResourceNotFoundException("User session not found");
        }
        return farmerRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found for user: " + userId));
    }
}
