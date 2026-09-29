package com.agroloop.controller.api.v1;

import com.agroloop.dto.api.v1.request.CancelOrderApiRequest;
import com.agroloop.dto.api.v1.request.VerifyPickupHandshakeApiRequest;
import com.agroloop.dto.api.v1.response.PickupHandshakePassResponse;
import com.agroloop.dto.api.v1.response.PickupHandshakeResultApiResponse;
import com.agroloop.dto.api.v1.response.PickupRequestApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.PickupRequest;
import com.agroloop.security.authorization.PickupSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.PickupHandshakeService;
import com.agroloop.service.PickupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pickups")
public class PickupApiController {

    private final PickupService pickupService;
    private final PickupSecurityEvaluator pickupSecurityEvaluator;
    private final IdempotencyService idempotencyService;
    private final PickupHandshakeService pickupHandshakeService;

    public PickupApiController(
            PickupService pickupService,
            PickupSecurityEvaluator pickupSecurityEvaluator,
            IdempotencyService idempotencyService,
            PickupHandshakeService pickupHandshakeService
    ) {
        this.pickupService = pickupService;
        this.pickupSecurityEvaluator = pickupSecurityEvaluator;
        this.idempotencyService = idempotencyService;
        this.pickupHandshakeService = pickupHandshakeService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PickupRequestApiResponse>> listPickups(Authentication auth) {
        Long userId = getUserId(auth);
        List<PickupRequest> pickups;
        if (hasRole(auth, "ROLE_ADMIN")) {
            pickups = pickupService.getAllPickups();
        } else if (hasRole(auth, "ROLE_FARMER")) {
            pickups = pickupService.getFarmerPickups(userId);
        } else {
            pickups = pickupService.getHouseholdPickups(userId);
        }
        return ResponseEntity.ok(pickups.stream().map(p -> 
                PickupRequestApiResponse.from(p, pickupHandshakeService.isHandshakeVerified(p))
        ).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@pickupAuth.canAccessPickup(authentication, #id)")
    public ResponseEntity<PickupRequestApiResponse> getPickup(@PathVariable Long id) {
        PickupRequest pickup = pickupService.getPickupById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup request not found: " + id));
        boolean verified = pickupHandshakeService.isHandshakeVerified(pickup);
        return ResponseEntity.ok(PickupRequestApiResponse.from(pickup, verified));
    }

    @PostMapping("/{id}/handshake/pass")
    @PreAuthorize("@pickupAuth.canAccessPickup(authentication, #id)")
    public ResponseEntity<PickupHandshakePassResponse> issueHandshakePass(
            @PathVariable Long id,
            Authentication auth
    ) {
        Long userId = getUserId(auth);
        PickupHandshakePassResponse pass = pickupHandshakeService.issueHandshakePass(id, userId);
        return ResponseEntity.ok(pass);
    }

    @PostMapping("/{id}/handshake")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<PickupHandshakeResultApiResponse> verifyHandshake(
            @PathVariable Long id,
            @Valid @RequestBody VerifyPickupHandshakeApiRequest request,
            Authentication auth
    ) {
        Long farmerUserId = getUserId(auth);
        PickupHandshakeResultApiResponse result = pickupHandshakeService.verifyAndConsumeHandshake(id, farmerUserId, request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("@pickupAuth.canCancelPickupAsHousehold(authentication, #id)")
    public ResponseEntity<PickupRequestApiResponse> cancelPickup(
            @PathVariable Long id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CancelOrderApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for cancelling a pickup");
        }

        Long userId = getUserId(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(userId);

        PickupRequestApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/pickups/" + id + "/cancel",
                request,
                PickupRequestApiResponse.class,
                () -> {
                    PickupRequest cancelled = pickupService.cancelPickup(id, userId, request.reason());
                    return PickupRequestApiResponse.from(cancelled);
                }
        );

        return ResponseEntity.ok(response);
    }

    private Long getUserId(Authentication auth) {
        Long id = pickupSecurityEvaluator.extractUserId(auth);
        if (id == null) {
            throw new AccessDeniedException("Unauthenticated user");
        }
        return id;
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(role));
    }
}
