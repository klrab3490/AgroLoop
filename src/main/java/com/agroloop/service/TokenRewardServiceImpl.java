package com.agroloop.service;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.TransactionType;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.service.token.TokenCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service implementation managing EcoToken reward minting, idempotency checks,
 * concurrency-safe wallet updates via pessimistic locking, and ledger persistence.
 */
@Service
public class TokenRewardServiceImpl implements TokenRewardService {

    private static final Logger log = LoggerFactory.getLogger(TokenRewardServiceImpl.class);

    private final TokenCalculator tokenCalculator;
    private final EcoTokenTransactionRepository transactionRepository;
    private final HouseholdRepository householdRepository;

    public TokenRewardServiceImpl(
            TokenCalculator tokenCalculator,
            EcoTokenTransactionRepository transactionRepository,
            HouseholdRepository householdRepository
    ) {
        this.tokenCalculator = tokenCalculator;
        this.transactionRepository = transactionRepository;
        this.householdRepository = householdRepository;
    }

    @Override
    @Transactional
    public EcoTokenTransaction mintRewardForVerification(WasteVerification verification) {
        Objects.requireNonNull(verification, "Waste verification cannot be null");
        Objects.requireNonNull(verification.getId(), "Waste verification must be persisted before minting rewards");

        // 1. Idempotency Check: Return existing transaction if already processed
        Optional<EcoTokenTransaction> existing = transactionRepository.findByWasteVerificationId(verification.getId());
        if (existing.isPresent()) {
            log.info("Reward already minted for verification ID: {}. Returning existing transaction ID: {}",
                    verification.getId(), existing.get().getId());
            return existing.get();
        }

        // 2. Resolve Household from verification -> pickup -> submission -> household
        Household household = verification.getPickupRequest().getWasteSubmission().getHousehold();
        Objects.requireNonNull(household, "Household associated with verification cannot be null");

        // 3. Acquire PESSIMISTIC_WRITE lock on Household to prevent race conditions during balance mutation
        Household lockedHousehold = householdRepository.findByIdForUpdate(household.getId())
                .orElseThrow(() -> new IllegalArgumentException("Household not found with ID: " + household.getId()));

        // Double-check idempotency under lock to completely close race conditions
        Optional<EcoTokenTransaction> existingUnderLock = transactionRepository.findByWasteVerificationId(verification.getId());
        if (existingUnderLock.isPresent()) {
            log.info("Reward already minted for verification ID: {} (detected under lock). Returning existing transaction ID: {}",
                    verification.getId(), existingUnderLock.get().getId());
            return existingUnderLock.get();
        }

        // 4. Calculate reward amount using configured polymorphic strategy
        BigDecimal reward = tokenCalculator.calculateReward(verification);


        // 5. Update household wallet balance if reward > 0
        String description;
        if (verification.getQualityGrade() == QualityGrade.REJECTED
                || !verification.isAcceptable()
                || reward.compareTo(BigDecimal.ZERO) <= 0) {
            description = "Waste rejected during verification — 0 tokens minted";
        } else {
            lockedHousehold.addTokens(reward);
            householdRepository.save(lockedHousehold);

            String categoryName = (verification.getPickupRequest() != null
                    && verification.getPickupRequest().getWasteSubmission() != null
                    && verification.getPickupRequest().getWasteSubmission().getCategory() != null)
                    ? verification.getPickupRequest().getWasteSubmission().getCategory().getDisplayName()
                    : "Organic Waste";

            description = String.format("Verified waste reward: %s kg (%s) - Category: %s",
                    verification.getVerifiedWeight(),
                    verification.getQualityGrade().getDisplayName(),
                    categoryName);
        }

        // 6. Record immutable transaction in ledger
        EcoTokenTransaction transaction = new EcoTokenTransaction(
                lockedHousehold,
                verification,
                reward,
                TransactionType.REWARD_MINTED,
                lockedHousehold.getTokenBalance(),
                description
        );

        EcoTokenTransaction saved = transactionRepository.save(transaction);
        log.info("Minted {} EcoTokens for household ID: {} (Verification ID: {}). New balance: {}",
                reward, lockedHousehold.getId(), verification.getId(), lockedHousehold.getTokenBalance());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EcoTokenTransaction> getHouseholdLedger(Long householdId) {
        return transactionRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getHouseholdBalance(Long householdId) {
        return householdRepository.findById(householdId)
                .map(Household::getTokenBalance)
                .orElse(BigDecimal.ZERO);
    }
}
