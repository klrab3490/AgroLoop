package com.agroloop.service;

import com.agroloop.dto.WasteSubmissionRequest;
import com.agroloop.model.Household;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import com.agroloop.service.storage.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

import com.agroloop.model.PickupRequest;
import com.agroloop.repository.PickupRequestRepository;

/**
 * Service implementation managing organic waste submissions.
 */
@Service
@Transactional(readOnly = true)
public class WasteSubmissionServiceImpl implements WasteSubmissionService {

    private final HouseholdRepository householdRepository;
    private final WasteSubmissionRepository wasteSubmissionRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final FileStorageService fileStorageService;

    public WasteSubmissionServiceImpl(
            HouseholdRepository householdRepository,
            WasteSubmissionRepository wasteSubmissionRepository,
            PickupRequestRepository pickupRequestRepository,
            FileStorageService fileStorageService
    ) {
        this.householdRepository = Objects.requireNonNull(householdRepository, "HouseholdRepository cannot be null");
        this.wasteSubmissionRepository = Objects.requireNonNull(wasteSubmissionRepository, "WasteSubmissionRepository cannot be null");
        this.pickupRequestRepository = Objects.requireNonNull(pickupRequestRepository, "PickupRequestRepository cannot be null");
        this.fileStorageService = Objects.requireNonNull(fileStorageService, "FileStorageService cannot be null");
    }

    @Override
    @Transactional
    public WasteSubmission submitWaste(String householdEmail, WasteSubmissionRequest request) {
        Objects.requireNonNull(request, "WasteSubmissionRequest cannot be null");

        Household household = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household user not found for email: " + householdEmail));

        // Store photo if present; returns null if file is missing or empty
        String imagePath = fileStorageService.storeFile(request.getPhoto(), "waste");

        // Domain method on Household creates WasteSubmission with address and coordinates
        WasteSubmission submission = household.submitWaste(
                request.getCategory(),
                request.getEstimatedWeight(),
                request.getPickupAddress(),
                imagePath,
                request.getNotes(),
                request.getLatitude(),
                request.getLongitude()
        );

        WasteSubmission savedSubmission = wasteSubmissionRepository.save(submission);

        // Instantiate linked PickupRequest in REQUESTED status for farmer discovery
        pickupRequestRepository.save(new PickupRequest(savedSubmission));

        return savedSubmission;
    }

    @Override
    public List<WasteSubmission> getSubmissionsByHousehold(String householdEmail) {
        Household household = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household user not found for email: " + householdEmail));

        return wasteSubmissionRepository.findByHouseholdIdOrderByCreatedAtDesc(household.getId());
    }

    @Override
    public WasteSubmission getSubmissionById(Long id) {
        return wasteSubmissionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Waste submission not found with id: " + id));
    }

    @Override
    public List<WasteSubmission> getAvailableSubmissions() {
        return wasteSubmissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.SUBMITTED);
    }

    @Override
    public long getSubmissionCountByHousehold(String householdEmail) {
        Household household = householdRepository.findByEmail(householdEmail)
                .orElseThrow(() -> new IllegalArgumentException("Household user not found for email: " + householdEmail));

        return wasteSubmissionRepository.countByHouseholdId(household.getId());
    }
}
