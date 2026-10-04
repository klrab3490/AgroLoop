package com.agroloop.controller.api.v1;

import com.agroloop.dto.WasteSubmissionRequest;
import com.agroloop.dto.api.v1.request.WasteSubmissionApiRequest;
import com.agroloop.dto.api.v1.response.EcoTokenTransactionApiResponse;
import com.agroloop.dto.api.v1.response.HouseholdBalanceResponse;
import com.agroloop.dto.api.v1.response.WasteSubmissionApiResponse;
import com.agroloop.exception.MissingIdempotencyKeyException;
import com.agroloop.exception.ResourceNotFoundException;
import com.agroloop.model.*;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.security.authorization.OrderSecurityEvaluator;
import com.agroloop.security.idempotency.IdempotencyScope;
import com.agroloop.security.idempotency.IdempotencyService;
import com.agroloop.service.MediaService;
import com.agroloop.service.TokenRewardService;
import com.agroloop.service.WasteSubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.dto.api.v1.request.FarmerApplicationApiRequest;
import com.agroloop.dto.api.v1.response.FarmerApplicationApiResponse;
import com.agroloop.service.UserService;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/household")
@PreAuthorize("hasAuthority('ROLE_HOUSEHOLD')")
public class HouseholdApiController {

    private final HouseholdRepository householdRepository;
    private final WasteSubmissionService wasteSubmissionService;
    private final TokenRewardService tokenRewardService;
    private final MediaService mediaService;
    private final IdempotencyService idempotencyService;
    private final OrderSecurityEvaluator orderSecurityEvaluator;
    private final UserService userService;

    public HouseholdApiController(
            HouseholdRepository householdRepository,
            WasteSubmissionService wasteSubmissionService,
            TokenRewardService tokenRewardService,
            MediaService mediaService,
            IdempotencyService idempotencyService,
            OrderSecurityEvaluator orderSecurityEvaluator,
            UserService userService
    ) {
        this.householdRepository = householdRepository;
        this.wasteSubmissionService = wasteSubmissionService;
        this.tokenRewardService = tokenRewardService;
        this.mediaService = mediaService;
        this.idempotencyService = idempotencyService;
        this.orderSecurityEvaluator = orderSecurityEvaluator;
        this.userService = userService;
    }

    @PostMapping("/farmer-application")
    public ResponseEntity<FarmerApplicationApiResponse> submitFarmerApplication(
            @Valid @RequestBody FarmerApplicationApiRequest request,
            Authentication auth
    ) {
        Household household = getAuthenticatedHousehold(auth);
        FarmerApplicationRequest formReq = new FarmerApplicationRequest(
                request.farmName(),
                request.farmAddress(),
                request.notes()
        );
        FarmerApplication saved = userService.submitFarmerApplication(household.getEmail(), formReq);
        return ResponseEntity.status(HttpStatus.CREATED).body(FarmerApplicationApiResponse.from(saved));
    }

    @GetMapping("/farmer-application")
    public ResponseEntity<FarmerApplicationApiResponse> getFarmerApplication(Authentication auth) {
        Household household = getAuthenticatedHousehold(auth);
        return userService.getLatestApplicationForUser(household.getId())
                .map(app -> ResponseEntity.ok(FarmerApplicationApiResponse.from(app)))
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/balance")
    public ResponseEntity<HouseholdBalanceResponse> getBalance(Authentication auth) {
        Household household = getAuthenticatedHousehold(auth);
        List<WasteSubmission> submissions = wasteSubmissionService.getSubmissionsByHousehold(household.getEmail());
        BigDecimal pendingTokens = submissions.stream()
                .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED)
                .map(s -> s.getEstimatedTokens() != null ? s.getEstimatedTokens() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ResponseEntity.ok(new HouseholdBalanceResponse(
                household.getId(),
                household.getTokenBalance(),
                pendingTokens,
                household.getUpdatedAt()
        ));
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<EcoTokenTransactionApiResponse>> getLedger(Authentication auth) {
        Household household = getAuthenticatedHousehold(auth);
        List<EcoTokenTransaction> transactions = tokenRewardService.getHouseholdLedger(household.getId());
        return ResponseEntity.ok(transactions.stream().map(EcoTokenTransactionApiResponse::from).toList());
    }

    @GetMapping("/waste-submissions")
    public ResponseEntity<List<WasteSubmissionApiResponse>> getSubmissions(Authentication auth) {
        Household household = getAuthenticatedHousehold(auth);
        List<WasteSubmission> submissions = wasteSubmissionService.getSubmissionsByHousehold(household.getEmail());
        return ResponseEntity.ok(submissions.stream().map(WasteSubmissionApiResponse::from).toList());
    }

    @PostMapping("/waste-submissions")
    public ResponseEntity<WasteSubmissionApiResponse> submitWaste(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody WasteSubmissionApiRequest request,
            Authentication auth
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for submitting waste");
        }

        Household household = getAuthenticatedHousehold(auth);
        IdempotencyScope scope = new IdempotencyScope.UserScope(household.getId());

        WasteSubmissionApiResponse response = idempotencyService.executeIdempotent(
                scope,
                idempotencyKey,
                "/api/v1/household/waste-submissions",
                request,
                WasteSubmissionApiResponse.class,
                () -> {
                    WasteSubmissionRequest serviceReq = new WasteSubmissionRequest(
                            request.category(),
                            request.estimatedWeight(),
                            request.addressOverride(),
                            null,
                            null
                    );
                    WasteSubmission submission = wasteSubmissionService.submitWaste(household.getEmail(), serviceReq);
                    if (request.mediaId() != null && !request.mediaId().isBlank()) {
                        mediaService.attachMedia(request.mediaId(), household.getId(), "waste_submissions", submission.getId());
                    }
                    return WasteSubmissionApiResponse.from(submission);
                }
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private Household getAuthenticatedHousehold(Authentication auth) {
        Long userId = orderSecurityEvaluator.extractUserId(auth);
        if (userId == null) {
            throw new ResourceNotFoundException("User session not found");
        }
        return householdRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Household not found for user: " + userId));
    }
}
