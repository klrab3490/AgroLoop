package com.agroloop.service;

import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteVerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PickupService Unit Tests (Phase 4)")
class PickupServiceTest {

    @Mock
    private PickupRequestRepository pickupRequestRepository;

    @Mock
    private WasteVerificationRepository wasteVerificationRepository;

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private TokenRewardService tokenRewardService;

    @InjectMocks
    private PickupServiceImpl pickupService;


    private Household household;
    private Farmer farmer;
    private Farmer unauthorizedFarmer;
    private WasteSubmission wasteSubmission;
    private PickupRequest pickupRequest;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        ReflectionTestUtils.setField(household, "id", 101L);

        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob's Farm", "456 Valley Rd", "Compost");
        ReflectionTestUtils.setField(farmer, "id", 201L);

        unauthorizedFarmer = new Farmer("Charlie", "charlie@example.com", "hash", "Charlie's Farm", "789 Lane", "Orchard");
        ReflectionTestUtils.setField(unauthorizedFarmer, "id", 202L);

        wasteSubmission = household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("5.00"), null, null, null);
        ReflectionTestUtils.setField(wasteSubmission, "id", 301L);

        pickupRequest = new PickupRequest(wasteSubmission);
        ReflectionTestUtils.setField(pickupRequest, "id", 401L);
    }

    @Test
    @DisplayName("claimPickup succeeds and persists assigned pickup")
    void claimPickupSuccess() {
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(farmerRepository.findById(201L)).thenReturn(Optional.of(farmer));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PickupRequest result = pickupService.claimPickup(401L, 201L);

        assertEquals(PickupStatus.ASSIGNED, result.getStatus());
        assertEquals(farmer, result.getAssignedFarmer());
        verify(pickupRequestRepository).save(pickupRequest);
    }

    @Test
    @DisplayName("schedulePickup succeeds for assigned farmer")
    void schedulePickupSuccess() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime futureSlot = LocalDateTime.now().plusDays(2);
        SchedulePickupRequest request = new SchedulePickupRequest(futureSlot);

        PickupRequest result = pickupService.schedulePickup(401L, 201L, request);

        assertEquals(PickupStatus.SCHEDULED, result.getStatus());
        assertEquals(futureSlot, result.getScheduledTime());
    }

    @Test
    @DisplayName("schedulePickup throws SecurityException when called by an unauthorized farmer")
    void schedulePickupUnauthorizedThrows() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));

        SchedulePickupRequest request = new SchedulePickupRequest(LocalDateTime.now().plusDays(2));

        SecurityException ex = assertThrows(SecurityException.class, () -> pickupService.schedulePickup(401L, 202L, request));
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    @DisplayName("collectPickup succeeds for assigned farmer")
    void collectPickupSuccess() {
        pickupRequest.accept(farmer);
        pickupRequest.schedule(LocalDateTime.now().plusDays(1));
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PickupRequest result = pickupService.collectPickup(401L, 201L);

        assertEquals(PickupStatus.COLLECTED, result.getStatus());
        assertNotNull(result.getCollectedAt());
    }

    @Test
    @DisplayName("verifyPickup persists WasteVerification and updates status to VERIFIED")
    void verifyPickupSuccess() {
        pickupRequest.accept(farmer);
        pickupRequest.schedule(LocalDateTime.now().plusDays(1));
        pickupRequest.markCollected();

        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(farmerRepository.findById(201L)).thenReturn(Optional.of(farmer));
        when(wasteVerificationRepository.save(any(WasteVerification.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WasteVerificationRequest req = new WasteVerificationRequest(new BigDecimal("5.10"), QualityGrade.GRADE_A, "Clean scraps");
        WasteVerification verification = pickupService.verifyPickup(401L, 201L, req);

        assertNotNull(verification);
        assertEquals(QualityGrade.GRADE_A, verification.getQualityGrade());
        assertEquals(new BigDecimal("5.10"), verification.getVerifiedWeight());
        assertEquals(PickupStatus.VERIFIED, pickupRequest.getStatus());
        verify(wasteVerificationRepository).save(verification);
        verify(pickupRequestRepository).save(pickupRequest);
        verify(tokenRewardService).mintRewardForVerification(verification);
    }


    @Test
    @DisplayName("declinePickup resets status to REQUESTED and unassigns farmer")
    void declinePickupSuccess() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PickupRequest result = pickupService.declinePickup(401L, 201L, "Vehicle failure");

        assertEquals(PickupStatus.REQUESTED, result.getStatus());
        assertEquals("Vehicle failure", result.getDeclineReason());
        assertEquals(SubmissionStatus.SUBMITTED, wasteSubmission.getStatus());
    }

    @Test
    @DisplayName("cancelPickup succeeds for owner household")
    void cancelPickupSuccess() {
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(pickupRequestRepository.save(any(PickupRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PickupRequest result = pickupService.cancelPickup(401L, 101L, "No longer needed");

        assertEquals(PickupStatus.CANCELLED, result.getStatus());
        assertEquals("No longer needed", result.getCancellationReason());
    }

    @Test
    @DisplayName("cancelPickup throws SecurityException when called by different household")
    void cancelPickupUnauthorizedThrows() {
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));

        SecurityException ex = assertThrows(SecurityException.class, () -> pickupService.cancelPickup(401L, 999L, "Reason"));
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    @DisplayName("createPickupRequest throws IllegalStateException when pickup already exists for submission")
    void createPickupRequestDuplicateThrows() {
        when(pickupRequestRepository.findByWasteSubmissionId(301L)).thenReturn(Optional.of(pickupRequest));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupService.createPickupRequest(wasteSubmission));
        assertTrue(ex.getMessage().contains("Pickup request already exists"));
    }

    @Test
    @DisplayName("collectPickup throws SecurityException when called by unauthorized farmer")
    void collectPickupUnauthorizedFarmerThrows() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));

        SecurityException ex = assertThrows(SecurityException.class, () -> pickupService.collectPickup(401L, 202L));
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    @DisplayName("verifyPickup throws SecurityException when called by unauthorized farmer")
    void verifyPickupUnauthorizedFarmerThrows() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));
        when(farmerRepository.findById(202L)).thenReturn(Optional.of(unauthorizedFarmer));

        WasteVerificationRequest req = new WasteVerificationRequest(new BigDecimal("5.00"), QualityGrade.GRADE_A, "Notes");
        SecurityException ex = assertThrows(SecurityException.class, () -> pickupService.verifyPickup(401L, 202L, req));
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    @DisplayName("declinePickup throws SecurityException when called by unauthorized farmer")
    void declinePickupUnauthorizedFarmerThrows() {
        pickupRequest.accept(farmer);
        when(pickupRequestRepository.findById(401L)).thenReturn(Optional.of(pickupRequest));

        SecurityException ex = assertThrows(SecurityException.class, () -> pickupService.declinePickup(401L, 202L, "Decline"));
        assertTrue(ex.getMessage().contains("not authorized"));
    }
}
