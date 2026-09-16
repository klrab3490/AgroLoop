package com.agroloop.controller;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.User;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;

    @Autowired
    public DashboardController(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository
    ) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
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
        model.addAttribute("user", admin);
        model.addAttribute("totalUsers", userRepository.count());
        model.addAttribute("totalHouseholds", householdRepository.count());
        model.addAttribute("totalFarmers", farmerRepository.count());
        return "dashboard/admin";
    }

    @GetMapping("/household/dashboard")
    public String householdDashboard(Authentication authentication, Model model) {
        Household household = householdRepository.findByEmail(authentication.getName()).orElse(null);
        model.addAttribute("user", household);
        return "dashboard/household";
    }

    @GetMapping("/farmer/dashboard")
    public String farmerDashboard(Authentication authentication, Model model) {
        Farmer farmer = farmerRepository.findByEmail(authentication.getName()).orElse(null);
        model.addAttribute("user", farmer);
        return "dashboard/farmer";
    }
}
