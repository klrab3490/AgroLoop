package com.agroloop.repository;

import com.agroloop.model.EcoTokenTransaction;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for immutable EcoTokenTransaction entities.
 */
@Repository
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
}
