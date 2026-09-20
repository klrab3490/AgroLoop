package com.agroloop.controller.web;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.dto.WasteSubmissionRequest;
import com.agroloop.model.*;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.service.UserService;
import com.agroloop.service.WasteSubmissionService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.agroloop.dto.CancelPickupRequest;
import com.agroloop.dto.SchedulePickupRequest;
import com.agroloop.dto.WasteVerificationRequest;
import com.agroloop.model.PickupRequest;
import com.agroloop.service.PickupService;
import com.agroloop.service.TokenRewardService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class DashboardController {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;
    private final UserService userService;
    private final WasteSubmissionService wasteSubmissionService;
    private final PickupService pickupService;
    private final TokenRewardService tokenRewardService;

    public DashboardController(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            UserService userService,
            WasteSubmissionService wasteSubmissionService,
            PickupService pickupService,
            TokenRewardService tokenRewardService
    ) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
        this.userService = userService;
        this.wasteSubmissionService = wasteSubmissionService;
        this.pickupService = pickupService;
        this.tokenRewardService = tokenRewardService;
    }


    @GetMapping("/dashboard")
    public String dashboardRedirect(Authentication authentication) {
        if (authentication == null) {
            return "redirect:/login";
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String role = authority.getAuthority();
            if ("ROLE_ADMIN".equals(role)) {
                return "redirect:/admin/dashboard";
            } else if ("ROLE_FARMER".equals(role)) {
                return "redirect:/farmer/dashboard";
            } else if ("ROLE_HOUSEHOLD".equals(role)) {
                return "redirect:/household/dashboard";
            }
        }
        return "redirect:/";
    }



    @GetMapping("/household/dashboard")
    public String householdDashboard(Authentication authentication, Model model) {
        Household household = householdRepository.findByEmail(authentication.getName()).orElse(null);
        model.addAttribute("user", household);

        if (household != null) {
            userService.getLatestApplicationForUser(household.getId()).ifPresent(app -> {
                model.addAttribute("latestApplication", app);
            });
            List<WasteSubmission> submissions = wasteSubmissionService.getSubmissionsByHousehold(authentication.getName());
            model.addAttribute("submissions", submissions);
            model.addAttribute("submissionsCount", submissions.size());

            List<PickupRequest> pickups = pickupService.getHouseholdPickups(household.getId());
            Map<Long, PickupRequest> pickupMap = pickups.stream()
                    .filter(p -> p.getWasteSubmission() != null)
                    .collect(Collectors.toMap(p -> p.getWasteSubmission().getId(), p -> p, (existing, replacement) -> existing));
            model.addAttribute("pickupMap", pickupMap);

            List<EcoTokenTransaction> tokenTransactions = tokenRewardService.getHouseholdLedger(household.getId());
            model.addAttribute("tokenTransactions", tokenTransactions);
        } else {
            model.addAttribute("submissions", List.of());
            model.addAttribute("submissionsCount", 0);
            model.addAttribute("pickupMap", Map.of());
            model.addAttribute("tokenTransactions", List.of());
        }


        if (!model.containsAttribute("farmerApplicationRequest")) {
            model.addAttribute("farmerApplicationRequest", new FarmerApplicationRequest());
        }

        if (!model.containsAttribute("wasteSubmissionRequest")) {
            model.addAttribute("wasteSubmissionRequest", new WasteSubmissionRequest());
        }

        if (!model.containsAttribute("cancelPickupRequest")) {
            model.addAttribute("cancelPickupRequest", new CancelPickupRequest());
        }

        model.addAttribute("categories", WasteCategory.values());

        return "dashboard/household";
    }

    @PostMapping("/household/waste/submit")
    public String submitWaste(
            @Valid @ModelAttribute("wasteSubmissionRequest") WasteSubmissionRequest request,
            BindingResult bindingResult,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            String firstError = bindingResult.getAllErrors().isEmpty()
                    ? "Please check the input values."
                    : bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", firstError);
            redirectAttributes.addFlashAttribute("wasteSubmissionRequest", request);
            return "redirect:/household/dashboard";
        }

        try {
            wasteSubmissionService.submitWaste(authentication.getName(), request);
            redirectAttributes.addFlashAttribute("successMessage", "Organic waste batch submitted successfully! Local farmers can now schedule a collection run.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to submit waste: " + ex.getMessage());
            redirectAttributes.addFlashAttribute("wasteSubmissionRequest", request);
        }

        return "redirect:/household/dashboard";
    }

    @PostMapping("/household/apply-farmer")
    public String applyForFarmerStatus(
            @Valid @ModelAttribute("farmerApplicationRequest") FarmerApplicationRequest request,
            BindingResult bindingResult,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        if (bindingResult.hasErrors()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Please correct the errors in the farmer application form.");
            redirectAttributes.addFlashAttribute("farmerApplicationRequest", request);
            return "redirect:/household/dashboard";
        }

        try {
            userService.submitFarmerApplication(authentication.getName(), request);
            redirectAttributes.addFlashAttribute("successMessage", "Your application to become a verified Farmer has been submitted successfully and is pending Admin approval!");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }

        return "redirect:/household/dashboard";
    }

    @GetMapping("/farmer/dashboard")
    public String farmerDashboard(Authentication authentication, Model model) {
        Farmer farmer = farmerRepository.findByEmail(authentication.getName()).orElse(null);
        model.addAttribute("user", farmer);

        if (farmer != null) {
            List<PickupRequest> availablePickups = pickupService.getAvailablePickups();
            List<PickupRequest> farmerPickups = pickupService.getFarmerPickups(farmer.getId());

            List<PickupRequest> activePickups = farmerPickups.stream()
                    .filter(p -> p.getStatus() == com.agroloop.model.PickupStatus.ASSIGNED
                            || p.getStatus() == com.agroloop.model.PickupStatus.SCHEDULED
                            || p.getStatus() == com.agroloop.model.PickupStatus.COLLECTED)
                    .toList();

            List<PickupRequest> verifiedPickups = farmerPickups.stream()
                    .filter(p -> p.getStatus() == com.agroloop.model.PickupStatus.VERIFIED)
                    .toList();

            model.addAttribute("availablePickups", availablePickups);
            model.addAttribute("activePickups", activePickups);
            model.addAttribute("verifiedPickups", verifiedPickups);
        } else {
            model.addAttribute("availablePickups", List.of());
            model.addAttribute("activePickups", List.of());
            model.addAttribute("verifiedPickups", List.of());
        }

        if (!model.containsAttribute("schedulePickupRequest")) {
            model.addAttribute("schedulePickupRequest", new SchedulePickupRequest());
        }

        if (!model.containsAttribute("wasteVerificationRequest")) {
            model.addAttribute("wasteVerificationRequest", new WasteVerificationRequest());
        }

        model.addAttribute("qualityGrades", com.agroloop.model.QualityGrade.values());

        return "dashboard/farmer";
    }
}

