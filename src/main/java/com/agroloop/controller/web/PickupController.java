package com.agroloop.controller.web;

import com.agroloop.dto.CancelPickupRequest;
import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.service.PickupService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class PickupController {

    private final PickupService pickupService;
    private final FarmerRepository farmerRepository;
    private final HouseholdRepository householdRepository;

    public PickupController(
            PickupService pickupService,
            FarmerRepository farmerRepository,
            HouseholdRepository householdRepository
    ) {
        this.pickupService = pickupService;
        this.farmerRepository = farmerRepository;
        this.householdRepository = householdRepository;
    }

    /**
     * Farmer claims an available pickup request.
     */
    @PostMapping("/farmer/pickups/{id}/claim")
    @PreAuthorize("hasRole('FARMER')")
    public String claimPickup(
            @PathVariable("id") Long id,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            pickupService.claimPickup(id, farmer.getId());
            redirectAttributes.addFlashAttribute("successMessage", "Pickup #" + id + " successfully claimed! Please schedule a collection appointment.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to claim pickup: " + ex.getMessage());
        }
        return "redirect:/farmer/dashboard";
    }

    /**
     * Farmer schedules an appointment time slot.
     */
    @PostMapping("/farmer/pickups/{id}/schedule")
    @PreAuthorize("hasRole('FARMER')")
    public String schedulePickup(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute("schedulePickupRequest") SchedulePickupRequest request,
            BindingResult bindingResult,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            String error = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", error != null ? error : "Invalid collection schedule.");
            return "redirect:/farmer/dashboard";
        }

        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            pickupService.schedulePickup(id, farmer.getId(), request);
            redirectAttributes.addFlashAttribute("successMessage", "Collection appointment scheduled for Pickup #" + id + ".");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to schedule pickup: " + ex.getMessage());
        }
        return "redirect:/farmer/dashboard";
    }

    /**
     * Farmer marks that physical collection of organic waste has taken place.
     */
    @PostMapping("/farmer/pickups/{id}/collect")
    @PreAuthorize("hasRole('FARMER')")
    public String collectPickup(
            @PathVariable("id") Long id,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            pickupService.collectPickup(id, farmer.getId());
            redirectAttributes.addFlashAttribute("successMessage", "Pickup #" + id + " marked as COLLECTED. Please inspect and verify the waste batch.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to mark collection: " + ex.getMessage());
        }
        return "redirect:/farmer/dashboard";
    }

    /**
     * Farmer performs post-collection inspection, recording actual weight and quality grade.
     */
    @PostMapping("/farmer/pickups/{id}/verify")
    @PreAuthorize("hasRole('FARMER')")
    public String verifyPickup(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute("wasteVerificationRequest") WasteVerificationRequest request,
            BindingResult bindingResult,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            String error = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", error != null ? error : "Invalid verification data.");
            return "redirect:/farmer/dashboard";
        }

        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            pickupService.verifyPickup(id, farmer.getId(), request);
            if (request.getQualityGrade().isAcceptable()) {
                redirectAttributes.addFlashAttribute("successMessage", "Waste batch for Pickup #" + id + " verified successfully (" + request.getQualityGrade().getDisplayName() + ")! EcoTokens have been credited to the household wallet.");
            } else {
                redirectAttributes.addFlashAttribute("successMessage", "Waste batch for Pickup #" + id + " recorded as " + request.getQualityGrade().getDisplayName() + ". Zero tokens were credited due to contamination.");
            }
        } catch (Exception ex) {


            redirectAttributes.addFlashAttribute("errorMessage", "Failed to verify waste: " + ex.getMessage());
        }
        return "redirect:/farmer/dashboard";
    }

    /**
     * Farmer declines or relinquishes the assignment, returning it to the available queue.
     */
    @PostMapping("/farmer/pickups/{id}/decline")
    @PreAuthorize("hasRole('FARMER')")
    public String declinePickup(
            @PathVariable("id") Long id,
            @RequestParam("reason") String reason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            pickupService.declinePickup(id, farmer.getId(), reason);
            redirectAttributes.addFlashAttribute("successMessage", "Pickup #" + id + " unassigned and returned to available queue.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to decline pickup: " + ex.getMessage());
        }
        return "redirect:/farmer/dashboard";
    }

    /**
     * Household cancels their pickup request prior to physical collection.
     */
    @PostMapping("/household/pickups/{id}/cancel")
    @PreAuthorize("hasRole('HOUSEHOLD')")
    public String cancelPickup(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute("cancelPickupRequest") CancelPickupRequest request,
            BindingResult bindingResult,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            String error = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", error != null ? error : "Cancellation reason cannot be blank.");
            return "redirect:/household/dashboard";
        }

        try {
            Household household = getAuthenticatedHousehold(authentication);
            pickupService.cancelPickup(id, household.getId(), request.getReason());
            redirectAttributes.addFlashAttribute("successMessage", "Pickup request #" + id + " has been cancelled.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to cancel pickup: " + ex.getMessage());
        }
        return "redirect:/household/dashboard";
    }

    private Farmer getAuthenticatedFarmer(Authentication authentication) {
        return farmerRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated farmer profile not found for: " + authentication.getName()));
    }

    private Household getAuthenticatedHousehold(Authentication authentication) {
        return householdRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated household profile not found for: " + authentication.getName()));
    }
}
