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

    public FarmerApiController(
            PickupService pickupService,
            ProductService productService,
            MarketplaceService marketplaceService,
            FarmerRepository farmerRepository,
            MediaService mediaService,
            IdempotencyService idempotencyService,
            PickupSecurityEvaluator pickupSecurityEvaluator
    ) {
        this.pickupService = pickupService;
        this.productService = productService;
        this.marketplaceService = marketplaceService;
        this.farmerRepository = farmerRepository;
        this.mediaService = mediaService;
        this.idempotencyService = idempotencyService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
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
    public ResponseEntity<List<OrderApiResponse>> getOrders(Authentication auth) {
        Farmer farmer = getAuthenticatedFarmer(auth);
        List<Order> orders = marketplaceService.getFarmerOrders(farmer.getEmail());
        return ResponseEntity.ok(orders.stream().map(OrderApiResponse::from).toList());
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
