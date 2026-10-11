package com.agroloop.repository;

import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Household;
import com.agroloop.model.Order;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for immutable EcoTokenTransaction entities.
 */
public interface EcoTokenTransactionRepository extends JpaRepository<EcoTokenTransaction, Long> {

    /**
     * Finds the transaction associated with a specific waste verification.
     */
    Optional<EcoTokenTransaction> findByWasteVerificationId(Long wasteVerificationId);

    /**
     * Checks whether a reward transaction has already been minted for a waste verification.
     */
    boolean existsByWasteVerificationId(Long wasteVerificationId);

    /**
     * Finds the transaction associated with an order and specific transaction type (e.g. MARKETPLACE_PURCHASE or ORDER_REFUND).
     */
    Optional<EcoTokenTransaction> findByOrderAndTransactionType(Order order, TransactionType transactionType);

    /**
     * Retrieves all transactions for a given household ordered strictly by ID ASC for deterministic Tier 1 ledger reconciliation.
     */
    @Query("SELECT t FROM EcoTokenTransaction t WHERE t.household = :household ORDER BY t.id ASC")
    List<EcoTokenTransaction> findByHouseholdOrderByIdAsc(@Param("household") Household household);

    /**
     * Retrieves a bounded page of transaction ledger records for a given household ordered newest first,
     * eagerly fetching wasteVerification to prevent LazyInitializationException during view rendering.
     */
    @Query("SELECT t FROM EcoTokenTransaction t LEFT JOIN FETCH t.wasteVerification WHERE t.household.id = :householdId ORDER BY t.createdAt DESC")
    List<EcoTokenTransaction> findByHouseholdIdOrderByCreatedAtDesc(@Param("householdId") Long householdId, Pageable pageable);

    /**
     * Default bounded retrieval for household dashboard views (capped to the 50 most recent transactions).
     */
    default List<EcoTokenTransaction> findByHouseholdIdOrderByCreatedAtDesc(Long householdId) {
        return findByHouseholdIdOrderByCreatedAtDesc(householdId, PageRequest.of(0, 50));
    }

    /**
     * Platform-wide paginated ledger query with relations eagerly fetched for administrative audit trails.
     */
    @Query(value = "SELECT t FROM EcoTokenTransaction t LEFT JOIN FETCH t.household LEFT JOIN FETCH t.actor LEFT JOIN FETCH t.order LEFT JOIN FETCH t.wasteVerification ORDER BY t.id DESC",
           countQuery = "SELECT count(t) FROM EcoTokenTransaction t")
    Page<EcoTokenTransaction> findAllPlatformTransactions(Pageable pageable);

    /**
     * Sum of all transaction amounts by direction across the entire platform.
     */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM EcoTokenTransaction t WHERE t.direction = :direction")
    BigDecimal sumAmountByDirection(@Param("direction") TransactionDirection direction);

    /**
     * Sum of all household balances across the entire platform.
     */
    @Query("SELECT COALESCE(SUM(h.tokenBalance), 0) FROM Household h")
    BigDecimal sumAllHouseholdBalances();
}
