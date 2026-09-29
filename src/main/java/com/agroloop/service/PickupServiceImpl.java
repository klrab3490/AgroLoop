package com.agroloop.service;

import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteVerificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class PickupServiceImpl implements PickupService {

    private final PickupRequestRepository pickupRequestRepository;
    private final WasteVerificationRepository wasteVerificationRepository;
    private final FarmerRepository farmerRepository;
    private final TokenRewardService tokenRewardService;

    public PickupServiceImpl(
            PickupRequestRepository pickupRequestRepository,
            WasteVerificationRepository wasteVerificationRepository,
            FarmerRepository farmerRepository,
            TokenRewardService tokenRewardService
    ) {
        this.pickupRequestRepository = pickupRequestRepository;
        this.wasteVerificationRepository = wasteVerificationRepository;
        this.farmerRepository = farmerRepository;
        this.tokenRewardService = tokenRewardService;
    }


    @Override
    @Transactional
    public PickupRequest createPickupRequest(WasteSubmission submission) {
        Objects.requireNonNull(submission, "Waste submission cannot be null");
        if (submission.getId() != null && pickupRequestRepository.findByWasteSubmissionId(submission.getId()).isPresent()) {
            throw new IllegalStateException("Pickup request already exists for submission #" + submission.getId());
        }
        PickupRequest pickupRequest = new PickupRequest(submission);
        return pickupRequestRepository.save(pickupRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PickupRequest> getPickupById(Long id) {
        return pickupRequestRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PickupRequest> getPickupByWasteSubmissionId(Long wasteSubmissionId) {
        return pickupRequestRepository.findByWasteSubmissionId(wasteSubmissionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PickupRequest> getAvailablePickups() {
        return pickupRequestRepository.findByStatusOrderByCreatedAtAsc(PickupStatus.REQUESTED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PickupRequest> getAllPickups() {
        return pickupRequestRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PickupRequest> getFarmerPickups(Long farmerId) {
        return pickupRequestRepository.findByAssignedFarmerIdOrderByCreatedAtDesc(farmerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PickupRequest> getHouseholdPickups(Long householdId) {
        return pickupRequestRepository.findByWasteSubmissionHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    @Override
    @Transactional
    public PickupRequest claimPickup(Long pickupId, Long farmerId) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        Farmer farmer = findFarmerOrThrow(farmerId);

        pickup.accept(farmer);
        return pickupRequestRepository.save(pickup);
    }

    @Override
    @Transactional
    public PickupRequest schedulePickup(Long pickupId, Long farmerId, SchedulePickupRequest request) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        assertFarmerAuthorized(pickup, farmerId);

        pickup.schedule(request.getScheduledTime());
        return pickupRequestRepository.save(pickup);
    }

    @Override
    @Transactional
    public PickupRequest collectPickup(Long pickupId, Long farmerId) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        assertFarmerAuthorized(pickup, farmerId);

        pickup.markCollected();
        return pickupRequestRepository.save(pickup);
    }

    @Override
    @Transactional
    public WasteVerification verifyPickup(Long pickupId, Long farmerId, WasteVerificationRequest request) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        Farmer farmer = findFarmerOrThrow(farmerId);
        assertFarmerAuthorized(pickup, farmerId);

        WasteVerification verification = new WasteVerification(
                pickup,
                farmer,
                request.getVerifiedWeight(),
                request.getQualityGrade(),
                request.getNotes()
        );

        pickup.recordVerification(verification);
        WasteVerification savedVerification = wasteVerificationRepository.save(verification);
        pickupRequestRepository.save(pickup);

        // Phase 5: Automatically mint and credit EcoTokens within the same transaction boundary
        tokenRewardService.mintRewardForVerification(savedVerification);

        return savedVerification;
    }


    @Override
    @Transactional
    public PickupRequest declinePickup(Long pickupId, Long farmerId, String reason) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        assertFarmerAuthorized(pickup, farmerId);

        pickup.decline(reason);
        return pickupRequestRepository.save(pickup);
    }

    @Override
    @Transactional
    public PickupRequest cancelPickup(Long pickupId, Long householdId, String reason) {
        PickupRequest pickup = findPickupOrThrow(pickupId);
        Long ownerHouseholdId = pickup.getWasteSubmission().getHousehold().getId();

        if (!Objects.equals(ownerHouseholdId, householdId)) {
            throw new SecurityException("You are not authorized to cancel a pickup request belonging to another household");
        }

        pickup.cancel(reason);
        return pickupRequestRepository.save(pickup);
    }

    // --- Helper Validation Methods ---

    private PickupRequest findPickupOrThrow(Long id) {
        return pickupRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pickup request not found with ID: " + id));
    }

    private Farmer findFarmerOrThrow(Long id) {
        return farmerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Farmer partner not found with ID: " + id));
    }

    private void assertFarmerAuthorized(PickupRequest pickup, Long farmerId) {
        if (pickup.getAssignedFarmer() == null || !Objects.equals(pickup.getAssignedFarmer().getId(), farmerId)) {
            throw new SecurityException("You are not authorized to manage this pickup assignment");
        }
    }
}
