package com.agroloop.repository;

import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.WasteSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WasteSubmissionRepository extends JpaRepository<WasteSubmission, Long> {

    /**
     * Finds all waste submissions created by a specific household, ordered with newest first.
     */
    List<WasteSubmission> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);

    /**
     * Finds all waste submissions matching a specific status (e.g. SUBMITTED), ordered with newest first.
     * Useful for farmers querying available batches to claim in Phase 4.
     */
    List<WasteSubmission> findByStatusOrderByCreatedAtDesc(SubmissionStatus status);

    /**
     * Counts the total number of submissions made by a specific household.
     */
    long countByHouseholdId(Long householdId);

    /**
     * Counts the total number of submissions across the platform with a specific status.
     */
    long countByStatus(SubmissionStatus status);

    /**
     * Finds submissions for a household matching a given status.
     */
    List<WasteSubmission> findByHouseholdIdAndStatusOrderByCreatedAtDesc(Long householdId, SubmissionStatus status);
}
