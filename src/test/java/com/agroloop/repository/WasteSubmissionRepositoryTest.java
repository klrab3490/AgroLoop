package com.agroloop.repository;

import com.agroloop.model.Household;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@DisplayName("WasteSubmissionRepository JPA Tests (Phase 3 - Step 2)")
class WasteSubmissionRepositoryTest {

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private HouseholdRepository householdRepository;

    @Test
    @DisplayName("Saves and retrieves waste submissions for a household")
    void testSaveAndFindByHousehold() {
        Household household = new Household("Household Bob", "bob@agroloop.com", "secret", "456 Palm Grove, Kochi");
        Household savedHousehold = householdRepository.save(household);

        WasteSubmission sub1 = savedHousehold.submitWaste(
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("6.50"),
                null,
                "uploads/waste/sample1.jpg",
                "Kitchen fruit and vegetable scraps"
        );
        wasteSubmissionRepository.save(sub1);

        WasteSubmission sub2 = savedHousehold.submitWaste(
                WasteCategory.GARDEN_WASTE,
                new BigDecimal("14.00"),
                "789 Alternate Road, Kochi",
                null,
                "Lawn trimmings"
        );
        wasteSubmissionRepository.save(sub2);

        List<WasteSubmission> results = wasteSubmissionRepository.findByHouseholdIdOrderByCreatedAtDesc(savedHousehold.getId());
        assertEquals(2, results.size());
        assertEquals(2, wasteSubmissionRepository.countByHouseholdId(savedHousehold.getId()));

        List<WasteSubmission> submittedList = wasteSubmissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.SUBMITTED);
        assertEquals(2, submittedList.size());
        assertEquals(2, wasteSubmissionRepository.countByStatus(SubmissionStatus.SUBMITTED));
    }

    @Test
    @DisplayName("Status filtering correctly segregates submissions")
    void testStatusFiltering() {
        Household household = new Household("Household Charlie", "charlie@agroloop.com", "secret", "123 Lake St");
        Household savedHousehold = householdRepository.save(household);

        WasteSubmission sub = savedHousehold.submitWaste(
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("2.50"),
                null,
                null,
                "Espresso grounds"
        );
        sub.markClaimed();
        wasteSubmissionRepository.save(sub);

        List<WasteSubmission> submitted = wasteSubmissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.SUBMITTED);
        List<WasteSubmission> claimed = wasteSubmissionRepository.findByStatusOrderByCreatedAtDesc(SubmissionStatus.CLAIMED);

        assertTrue(submitted.isEmpty());
        assertEquals(1, claimed.size());
        assertEquals(1, wasteSubmissionRepository.countByStatus(SubmissionStatus.CLAIMED));
        assertEquals(0, wasteSubmissionRepository.countByStatus(SubmissionStatus.SUBMITTED));
    }
}
