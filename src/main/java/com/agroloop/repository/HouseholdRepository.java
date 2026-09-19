package com.agroloop.repository;

import com.agroloop.model.Household;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface HouseholdRepository extends JpaRepository<Household, Long> {

    Optional<Household> findByEmail(String email);

    /**
     * Retrieves the Household entity with an exclusive PESSIMISTIC_WRITE lock
     * to ensure thread-safe balance mutations and prevent lost updates during concurrent reward minting.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Household h WHERE h.id = :id")
    Optional<Household> findByIdForUpdate(@Param("id") Long id);
}

