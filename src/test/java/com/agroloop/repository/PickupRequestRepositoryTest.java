package com.agroloop.repository;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.PickupStatus;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@DisplayName("PickupRequestRepository & WasteVerificationRepository JPA Tests (Phase 4)")
class PickupRequestRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private WasteVerificationRepository wasteVerificationRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Test
    @DisplayName("Saves and queries pickup requests by status and assigned farmer")
    void testSaveAndQueryPickupRequests() {
        Household household = householdRepository.save(new Household("Alice", "alice@example.com", "pass", "123 Green Way"));
        Farmer farmer = farmerRepository.save(new Farmer("Bob", "bob@example.com", "pass", "Bob Farm", "456 Valley Rd", "Compost"));

        WasteSubmission sub1 = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("5.00"), null, null, null));
        WasteSubmission sub2 = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.GARDEN_WASTE, new BigDecimal("10.00"), null, null, null));

        PickupRequest req1 = new PickupRequest(sub1);
        req1.accept(farmer);
        req1.schedule(LocalDateTime.now().plusDays(2));
        pickupRequestRepository.save(req1);

        PickupRequest req2 = new PickupRequest(sub2);
        pickupRequestRepository.save(req2);

        // Query available (REQUESTED)
        List<PickupRequest> available = pickupRequestRepository.findByStatusOrderByCreatedAtAsc(PickupStatus.REQUESTED);
        assertEquals(1, available.size());
        assertEquals(req2.getId(), available.get(0).getId());

        // Query scheduled for farmer
        List<PickupRequest> farmerPickups = pickupRequestRepository.findByAssignedFarmerIdOrderByCreatedAtDesc(farmer.getId());
        assertEquals(1, farmerPickups.size());
        assertEquals(PickupStatus.SCHEDULED, farmerPickups.get(0).getStatus());

        // Query by waste submission ID
        Optional<PickupRequest> bySubId = pickupRequestRepository.findByWasteSubmissionId(sub1.getId());
        assertTrue(bySubId.isPresent());
        assertEquals(req1.getId(), bySubId.get().getId());
    }

    @Test
    @DisplayName("Saves and links WasteVerification to PickupRequest")
    void testWasteVerificationPersistence() {
        Household household = householdRepository.save(new Household("Charlie", "charlie@example.com", "pass", "101 River Rd"));
        Farmer farmer = farmerRepository.save(new Farmer("Dave", "dave@example.com", "pass", "Dave Farm", "202 Mountain Rd", "Orchard"));

        WasteSubmission sub = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("6.00"), null, null, null));
        PickupRequest req = new PickupRequest(sub);
        req.accept(farmer);
        req.schedule(LocalDateTime.now().plusDays(1));
        req.markCollected();
        pickupRequestRepository.save(req);

        WasteVerification verification = new WasteVerification(req, farmer, new BigDecimal("6.20"), QualityGrade.GRADE_A, "Clean batch");
        wasteVerificationRepository.save(verification);

        req.recordVerification(verification);
        pickupRequestRepository.save(req);

        Optional<WasteVerification> retrieved = wasteVerificationRepository.findByPickupRequestId(req.getId());
        assertTrue(retrieved.isPresent());
        assertEquals(new BigDecimal("6.20"), retrieved.get().getVerifiedWeight());
        assertEquals(QualityGrade.GRADE_A, retrieved.get().getQualityGrade());
        assertEquals(farmer.getId(), retrieved.get().getVerifiedByFarmer().getId());

        List<WasteVerification> farmerVerifications = wasteVerificationRepository.findByVerifiedByFarmerIdOrderByVerifiedAtDesc(farmer.getId());
        assertEquals(1, farmerVerifications.size());
    }

    @Test
    @DisplayName("Optimistic locking version field is managed and increments upon update")
    void testOptimisticLockingVersion() {
        Household household = householdRepository.save(new Household("Eva", "eva@example.com", "pass", "333 Bloom Ave"));
        Farmer farmer = farmerRepository.save(new Farmer("Frank", "frank@example.com", "pass", "Frank Farm", "444 Bloom Rd", "Crops"));
        WasteSubmission sub = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("4.00"), null, null, null));

        PickupRequest req = new PickupRequest(sub);
        req = pickupRequestRepository.saveAndFlush(req);

        assertEquals(0L, req.getVersion());

        req.accept(farmer);
        req = pickupRequestRepository.saveAndFlush(req);

        assertEquals(1L, req.getVersion());
    }

    @Test
    @DisplayName("Database enforces UNIQUE constraint on waste_submission_id")
    void testUniqueWasteSubmissionConstraint() {
        Household household = householdRepository.save(new Household("Grace", "grace@example.com", "pass", "555 Pine Rd"));
        WasteSubmission sub = wasteSubmissionRepository.save(household.submitWaste(WasteCategory.FOOD_SCRAPS, new BigDecimal("3.00"), null, null, null));

        PickupRequest req1 = new PickupRequest(sub);
        pickupRequestRepository.saveAndFlush(req1);

        PickupRequest req2 = new PickupRequest(sub);
        assertThrows(DataIntegrityViolationException.class, () -> {
            pickupRequestRepository.saveAndFlush(req2);
        });
    }
}
