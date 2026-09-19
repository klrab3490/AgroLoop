package com.agroloop.service;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.TransactionType;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.service.token.TokenCalculator;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TokenRewardService Unit & Idempotency Tests (Phase 5)")
class TokenRewardServiceTest {

    @Mock
    private TokenCalculator tokenCalculator;

    @Mock
    private EcoTokenTransactionRepository transactionRepository;

    @Mock
    private HouseholdRepository householdRepository;

    @InjectMocks
    private TokenRewardServiceImpl tokenRewardService;

    private Household household;
    private Farmer farmer;
    private WasteSubmission wasteSubmission;
    private PickupRequest pickupRequest;
    private WasteVerification verification;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Green", "alice@example.com", "hash", "123 Green Way");
        ReflectionTestUtils.setField(household, "id", 101L);

        farmer = new Farmer("Bob Brown", "bob@example.com", "hash", "Bob Farm", "456 Valley Rd", "Compost");
        ReflectionTestUtils.setField(farmer, "id", 201L);

        wasteSubmission = household.submitWaste(WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.00"), "123 Green Way", null, "Notes");
        ReflectionTestUtils.setField(wasteSubmission, "id", 301L);

        pickupRequest = new PickupRequest(wasteSubmission);
        ReflectionTestUtils.setField(pickupRequest, "id", 401L);
        pickupRequest.accept(farmer);
        pickupRequest.schedule(LocalDateTime.now().plusDays(1));
        pickupRequest.markCollected();

        verification = new WasteVerification(pickupRequest, farmer, new BigDecimal("5.00"), QualityGrade.GRADE_A, "Clean batch");
        ReflectionTestUtils.setField(verification, "id", 501L);
    }

    @Test
    @DisplayName("mintRewardForVerification calculates reward, acquires pessimistic lock, and credits household wallet")
    void mintReward_success() {
        when(transactionRepository.findByWasteVerificationId(501L)).thenReturn(Optional.empty());
        when(householdRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(household));
        when(tokenCalculator.calculateReward(verification)).thenReturn(new BigDecimal("9.00"));
        when(transactionRepository.save(any(EcoTokenTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        EcoTokenTransaction result = tokenRewardService.mintRewardForVerification(verification);

        assertNotNull(result);
        assertEquals(new BigDecimal("9.00"), result.getAmount());
        assertEquals(TransactionType.REWARD_MINTED, result.getTransactionType());
        assertEquals(new BigDecimal("9.00"), household.getTokenBalance());
        assertEquals(new BigDecimal("9.00"), result.getBalanceAfter());
        assertTrue(result.getDescription().contains("Verified waste reward"));

        verify(householdRepository).findByIdForUpdate(101L);
        verify(householdRepository).save(household);
        verify(transactionRepository).save(any(EcoTokenTransaction.class));
    }

    @Test
    @DisplayName("Idempotency: When transaction already exists, returns existing without double crediting")
    void mintReward_idempotency_returnsExisting() {
        EcoTokenTransaction existingTx = new EcoTokenTransaction(
                household,
                verification,
                new BigDecimal("9.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("9.00"),
                "Existing reward"
        );
        when(transactionRepository.findByWasteVerificationId(501L)).thenReturn(Optional.of(existingTx));

        EcoTokenTransaction result = tokenRewardService.mintRewardForVerification(verification);

        assertEquals(existingTx, result);
        verify(householdRepository, never()).findByIdForUpdate(any());
        verify(tokenCalculator, never()).calculateReward(any());
        verify(householdRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Idempotency: When duplicate appears during post-lock re-check, returns existing without double crediting")
    void mintReward_idempotency_postLockRecheck_returnsExisting() {
        EcoTokenTransaction existingTx = new EcoTokenTransaction(
                household,
                verification,
                new BigDecimal("9.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("9.00"),
                "Existing reward under lock"
        );
        // First check returns empty, second check (under lock) returns existing transaction
        when(transactionRepository.findByWasteVerificationId(501L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existingTx));
        when(householdRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(household));

        EcoTokenTransaction result = tokenRewardService.mintRewardForVerification(verification);

        assertEquals(existingTx, result);
        verify(householdRepository).findByIdForUpdate(101L);
        verify(tokenCalculator, never()).calculateReward(any());
        verify(householdRepository, never()).save(any());
    }


    @Test
    @DisplayName("Zero-Reward: Rejected waste creates 0.00 audit ledger transaction without crediting wallet")
    void mintReward_rejectedWaste_createsZeroTokenAuditLedger() {
        WasteVerification rejectedVerification = new WasteVerification(pickupRequest, farmer, new BigDecimal("5.00"), QualityGrade.REJECTED, "Contaminated with plastic");
        ReflectionTestUtils.setField(rejectedVerification, "id", 502L);

        when(transactionRepository.findByWasteVerificationId(502L)).thenReturn(Optional.empty());
        when(householdRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(household));
        when(tokenCalculator.calculateReward(rejectedVerification)).thenReturn(new BigDecimal("0.00"));
        when(transactionRepository.save(any(EcoTokenTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        EcoTokenTransaction result = tokenRewardService.mintRewardForVerification(rejectedVerification);

        assertNotNull(result);
        assertEquals(new BigDecimal("0.00"), result.getAmount());
        assertEquals(TransactionType.REWARD_MINTED, result.getTransactionType());
        assertEquals(BigDecimal.ZERO, household.getTokenBalance());
        assertEquals(BigDecimal.ZERO.setScale(2), result.getBalanceAfter());
        assertEquals("Waste rejected during verification — 0 tokens minted", result.getDescription());

        verify(householdRepository, never()).save(household);
        verify(transactionRepository).save(any(EcoTokenTransaction.class));
    }

    @Test
    @DisplayName("getHouseholdLedger delegates to transaction repository")
    void getHouseholdLedger_success() {
        EcoTokenTransaction tx = new EcoTokenTransaction(
                household,
                verification,
                new BigDecimal("9.00"),
                TransactionType.REWARD_MINTED,
                new BigDecimal("9.00"),
                "Reward"
        );
        when(transactionRepository.findByHouseholdIdOrderByCreatedAtDesc(101L)).thenReturn(List.of(tx));

        List<EcoTokenTransaction> ledger = tokenRewardService.getHouseholdLedger(101L);

        assertEquals(1, ledger.size());
        assertEquals(tx, ledger.get(0));
    }

    @Test
    @DisplayName("getHouseholdBalance returns current wallet balance")
    void getHouseholdBalance_success() {
        household.addTokens(new BigDecimal("50.00"));
        when(householdRepository.findById(101L)).thenReturn(Optional.of(household));

        BigDecimal balance = tokenRewardService.getHouseholdBalance(101L);

        assertEquals(new BigDecimal("50.00"), balance);
    }
}
