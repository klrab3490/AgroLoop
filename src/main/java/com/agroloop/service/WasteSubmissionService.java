package com.agroloop.service;

import com.agroloop.dto.WasteSubmissionRequest;
import com.agroloop.model.WasteSubmission;

import java.util.List;

/**
 * Service abstraction contract for managing organic waste submissions.
 */
public interface WasteSubmissionService {

    /**
     * Submits a new batch of organic waste originating from a Household.
     *
     * @param householdEmail the email of the authenticated household user
     * @param request form payload containing category, estimated weight, custom address, photo, notes
     * @return the saved WasteSubmission entity
     */
    WasteSubmission submitWaste(String householdEmail, WasteSubmissionRequest request);

    /**
     * Retrieves all waste submissions submitted by a specific household.
     */
    List<WasteSubmission> getSubmissionsByHousehold(String householdEmail);

    /**
     * Retrieves a single waste submission by its identifier.
     */
    WasteSubmission getSubmissionById(Long id);

    /**
     * Retrieves all submissions available for pickup claiming (status == SUBMITTED).
     */
    List<WasteSubmission> getAvailableSubmissions();

    /**
     * Returns total count of submissions for a given household.
     */
    long getSubmissionCountByHousehold(String householdEmail);
}
