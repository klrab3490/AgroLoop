package com.agroloop.controller;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import com.agroloop.repository.WasteVerificationRepository;
import com.agroloop.service.TokenRewardService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Dashboard Controller Integration Tests")
class DashboardIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HouseholdRepository householdRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private WasteSubmissionRepository wasteSubmissionRepository;

    @Autowired
    private PickupRequestRepository pickupRequestRepository;

    @Autowired
    private WasteVerificationRepository wasteVerificationRepository;

    @Autowired
    private EcoTokenTransactionRepository transactionRepository;

    @Autowired
    private TokenRewardService tokenRewardService;

    private Household testHousehold;
    private Farmer testFarmer;
    private WasteSubmission testSubmission;
    private PickupRequest testPickup;
    private WasteVerification testVerification;

    @BeforeEach
    void setUp() {
        testHousehold = householdRepository.findByEmail("household@agroloop.com").orElseGet(() ->
                householdRepository.save(new Household("Alice Green", "household@agroloop.com", "household123", "123 Eco St"))
        );

        testFarmer = farmerRepository.findByEmail("farmer@agroloop.com").orElseGet(() ->
                farmerRepository.save(new Farmer("Bob Farmer", "farmer@agroloop.com", "farmer123", "Green Farm", "456 Valley Rd", "Compost"))
        );
    }

    @AfterEach
    void tearDown() {
        transactionRepository.deleteAll();
        wasteVerificationRepository.deleteAll();
        pickupRequestRepository.deleteAll();
        wasteSubmissionRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "household@agroloop.com", authorities = {"ROLE_HOUSEHOLD"})
    @DisplayName("GET /household/dashboard renders populated EcoToken ledger without LazyInitializationException")
    void householdDashboardRendersPopulatedEcoTokenLedger() throws Exception {
        // Create a verified waste submission and mint an EcoToken reward
        testSubmission = wasteSubmissionRepository.save(
                testHousehold.submitWaste(WasteCategory.COFFEE_GROUNDS, new BigDecimal("6.00"), "123 Eco St", null, "Rich coffee grounds")
        );

        testPickup = new PickupRequest(testSubmission);
        testPickup.accept(testFarmer);
        testPickup.schedule(LocalDateTime.now().plusHours(2));
        testPickup.markCollected();
        testPickup = pickupRequestRepository.save(testPickup);

        testVerification = new WasteVerification(testPickup, testFarmer, new BigDecimal("6.00"), QualityGrade.GRADE_A, "High nitrogen grounds");
        testPickup.recordVerification(testVerification);
        testVerification = wasteVerificationRepository.save(testVerification);
        pickupRequestRepository.save(testPickup);

        EcoTokenTransaction tx = tokenRewardService.mintRewardForVerification(testVerification);

        mockMvc.perform(get("/household/dashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/household"))
                .andExpect(model().attributeExists("tokenTransactions"))
                .andExpect(content().string(containsString("EcoToken Reward Ledger")))
                .andExpect(content().string(containsString("REWARD MINTED")))
                .andExpect(content().string(containsString("Verification #")))
                .andExpect(content().string(containsString("Grade A - Premium")))
                .andExpect(content().string(containsString("6.00")))
                .andExpect(content().string(containsString(tx.getAmount().toString())));
    }
}
