package com.agroloop.service;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.dto.RegisterRequest;
import com.agroloop.model.FarmerApplication;
import com.agroloop.model.Household;
import com.agroloop.model.User;

import java.util.List;
import java.util.Optional;

public interface UserService {

    /**
     * Registers a new user. Newly registered accounts default to the Household role.
     */
    Household registerHousehold(RegisterRequest request);

    /**
     * Submits an application for a Household user to convert their account into a Farmer account.
     */
    FarmerApplication submitFarmerApplication(String userEmail, FarmerApplicationRequest request);

    /**
     * Approves a pending farmer conversion application, converting the user to ROLE_FARMER.
     */
    void approveFarmerApplication(Long applicationId);

    /**
     * Rejects a pending farmer conversion application with an administrative reason.
     */
    void rejectFarmerApplication(Long applicationId, String reason);

    /**
     * Returns all applications currently awaiting administrative review.
     */
    List<FarmerApplication> getPendingFarmerApplications();

    /**
     * Directly converts an existing Household or user into a verified Farmer partner.
     */
    User convertUserToFarmer(Long userId, String farmName, String farmAddress, String notes);

    /**
     * Returns the most recent application for a given user ID, if any exists.
     */
    Optional<FarmerApplication> getLatestApplicationForUser(Long userId);
}
