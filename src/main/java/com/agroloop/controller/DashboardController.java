package com.agroloop.controller;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.model.Farmer;
import com.agroloop.model.FarmerApplication;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
public class DashboardController {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;
    private final UserService userService;

    @Autowired
    public DashboardController(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            UserService userService
    ) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
        this.userService = userService;
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

    @GetMapping("/admin/dashboard")
    public String adminDashboard(Authentication authentication, Model model) {
        User admin = userRepository.findByEmail(authentication.getName()).orElse(null);
        List<FarmerApplication> pendingApps = userService.getPendingFarmerApplications();

        model.addAttribute("user", admin);
        model.addAttribute("totalUsers", userRepository.count());
        model.addAttribute("totalHouseholds", householdRepository.count());
        model.addAttribute("totalFarmers", farmerRepository.count());
        model.addAttribute("pendingApplications", pendingApps);
        return "dashboard/admin";
    }

    @PostMapping("/admin/applications/{id}/approve")
    public String approveFarmerApplication(@PathVariable("id") Long id, RedirectAttributes redirectAttributes) {
        try {
            userService.approveFarmerApplication(id);
            redirectAttributes.addFlashAttribute("successMessage", "Farmer application #" + id + " has been approved. The user is now a verified Farmer.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to approve application: " + ex.getMessage());
        }
        return "redirect:/admin/dashboard";
    }

    @PostMapping("/admin/applications/{id}/reject")
    public String rejectFarmerApplication(
            @PathVariable("id") Long id,
            @RequestParam(value = "reason", defaultValue = "Application does not meet current verification criteria.") String reason,
            RedirectAttributes redirectAttributes
    ) {
        try {
            userService.rejectFarmerApplication(id, reason);
            redirectAttributes.addFlashAttribute("successMessage", "Farmer application #" + id + " has been rejected.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to reject application: " + ex.getMessage());
        }
        return "redirect:/admin/dashboard";
    }

    @GetMapping("/household/dashboard")
    public String householdDashboard(Authentication authentication, Model model) {
        Household household = householdRepository.findByEmail(authentication.getName()).orElse(null);
        model.addAttribute("user", household);

        if (household != null) {
            userService.getLatestApplicationForUser(household.getId()).ifPresent(app -> {
                model.addAttribute("latestApplication", app);
            });
        }

        if (!model.containsAttribute("farmerApplicationRequest")) {
            model.addAttribute("farmerApplicationRequest", new FarmerApplicationRequest());
        }

        return "dashboard/household";
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
        return "dashboard/farmer";
    }
}

