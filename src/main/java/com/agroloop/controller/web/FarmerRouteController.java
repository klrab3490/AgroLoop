package com.agroloop.controller.web;

import com.agroloop.model.CollectionRoute;
import com.agroloop.model.Farmer;
import com.agroloop.model.RouteStop;
import com.agroloop.model.WasteSubmission;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.service.RouteService;
import com.agroloop.service.matching.WasteMatchResult;
import com.agroloop.service.matching.WasteMatcherRegistry;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/farmer/routes")
@PreAuthorize("hasRole('FARMER')")
public class FarmerRouteController {

    private final RouteService routeService;
    private final FarmerRepository farmerRepository;
    private final WasteMatcherRegistry wasteMatcherRegistry;

    public FarmerRouteController(
            RouteService routeService,
            FarmerRepository farmerRepository,
            WasteMatcherRegistry wasteMatcherRegistry
    ) {
        this.routeService = routeService;
        this.farmerRepository = farmerRepository;
        this.wasteMatcherRegistry = wasteMatcherRegistry;
    }

    private Farmer getAuthenticatedFarmer(Authentication authentication) {
        return farmerRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated farmer profile not found"));
    }

    @GetMapping
    public String showRoutesAndMatching(
            @RequestParam(value = "strategy", defaultValue = "COMPOSITE") String strategy,
            Authentication authentication,
            Model model
    ) {
        Farmer farmer = getAuthenticatedFarmer(authentication);
        model.addAttribute("user", farmer);

        // Fetch matched pickup recommendations
        List<WasteMatchResult> recommendations = routeService.getPickupRecommendations(farmer.getId(), strategy);
        model.addAttribute("recommendations", recommendations);
        model.addAttribute("selectedStrategy", strategy.toUpperCase());
        model.addAttribute("availableStrategies", wasteMatcherRegistry.getAvailableStrategies());

        // Fetch active routes
        List<CollectionRoute> activeRoutes = routeService.getActiveRoutes(farmer.getId());
        model.addAttribute("activeRoutes", activeRoutes);

        // Generate Google Maps navigation URLs for active routes
        Map<Long, String> navigationUrls = new HashMap<>();
        for (CollectionRoute route : activeRoutes) {
            StringBuilder navUrl = new StringBuilder("https://www.google.com/maps/dir/");
            Double currentLat = farmer.getLatitude() != null ? farmer.getLatitude() : 10.8505;
            Double currentLng = farmer.getLongitude() != null ? farmer.getLongitude() : 76.2711;
            navUrl.append(String.format("%.6f,%.6f/", currentLat, currentLng));

            for (RouteStop stop : route.getStops()) {
                WasteSubmission s = stop.getPickupRequest().getWasteSubmission();
                if (s != null && s.getLatitude() != null && s.getLongitude() != null) {
                    navUrl.append(String.format("%.6f,%.6f/", s.getLatitude(), s.getLongitude()));
                }
            }
            navigationUrls.put(route.getId(), navUrl.toString());
        }
        model.addAttribute("navigationUrls", navigationUrls);
        model.addAttribute("today", LocalDate.now());

        return "farmer/routes";
    }

    @PostMapping("/generate")
    public String generateRoute(
            @RequestParam("pickupIds") List<Long> pickupIds,
            @RequestParam(value = "routeDate", required = false) String routeDateStr,
            @RequestParam(value = "notes", required = false) String notes,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            LocalDate routeDate = (routeDateStr != null && !routeDateStr.isBlank())
                    ? LocalDate.parse(routeDateStr.trim())
                    : LocalDate.now();

            CollectionRoute route = routeService.createOptimizedRoute(farmer.getId(), routeDate, pickupIds, notes);
            redirectAttributes.addFlashAttribute("successMessage",
                    String.format("Optimized route #%d created with %d stops (%.1f km total distance)!",
                            route.getId(), route.getStops().size(), route.getTotalDistanceKm()));
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to generate route: " + ex.getMessage());
        }
        return "redirect:/farmer/routes";
    }

    @PostMapping("/{id}/start")
    public String startRoute(
            @PathVariable("id") Long id,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            routeService.startRoute(id, farmer.getId());
            redirectAttributes.addFlashAttribute("successMessage", "Route #" + id + " started! Safe travels on your collection run.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to start route: " + ex.getMessage());
        }
        return "redirect:/farmer/routes";
    }

    @PostMapping("/{id}/stops/{stopId}/complete")
    public String completeStop(
            @PathVariable("id") Long id,
            @PathVariable("stopId") Long stopId,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            routeService.completeStop(id, stopId, farmer.getId());
            redirectAttributes.addFlashAttribute("successMessage", "Stop completed successfully!");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to complete stop: " + ex.getMessage());
        }
        return "redirect:/farmer/routes";
    }

    @PostMapping("/{id}/cancel")
    public String cancelRoute(
            @PathVariable("id") Long id,
            @RequestParam(value = "reason", required = false) String reason,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            routeService.cancelRoute(id, farmer.getId(), reason);
            redirectAttributes.addFlashAttribute("successMessage", "Route #" + id + " has been cancelled.");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to cancel route: " + ex.getMessage());
        }
        return "redirect:/farmer/routes";
    }

    @PostMapping("/settings")
    public String updateSettings(
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam("serviceRadiusKm") Double serviceRadiusKm,
            @RequestParam("maxDailyCapacityKg") BigDecimal maxDailyCapacityKg,
            Authentication authentication,
            RedirectAttributes redirectAttributes
    ) {
        try {
            Farmer farmer = getAuthenticatedFarmer(authentication);
            routeService.updateFarmerLocationAndCapacity(farmer.getId(), latitude, longitude, serviceRadiusKm, maxDailyCapacityKg);
            redirectAttributes.addFlashAttribute("successMessage", "Farm location and daily capacity settings saved successfully!");
        } catch (Exception ex) {
            redirectAttributes.addFlashAttribute("errorMessage", "Failed to update settings: " + ex.getMessage());
        }
        return "redirect:/farmer/routes";
    }
}
