package com.agroloop.dto.api.v1.response;

import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Role;
import com.agroloop.model.User;
import org.hibernate.Hibernate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserApiResponse(
        Long id,
        String email,
        String name,
        Role role,
        boolean enabled,
        BigDecimal tokenBalance,
        LocalDateTime createdAt,
        String address,
        String farmName,
        String farmAddress,
        String notes,
        Double serviceRadiusKm,
        BigDecimal maxDailyCapacityKg,
        Double averageRating,
        Integer reviewCount
) {
    public UserApiResponse(Long id, String email, String name, Role role, boolean enabled) {
        this(id, email, name, role, enabled, null, null, null, null, null, null, null, null, null, null);
    }

    public static UserApiResponse from(User user) {
        if (user == null) {
            return null;
        }

        User unproxied = (User) Hibernate.unproxy(user);

        BigDecimal tokenBalance = null;
        String address = null;
        String farmName = null;
        String farmAddress = null;
        String notes = null;
        Double serviceRadiusKm = null;
        BigDecimal maxDailyCapacityKg = null;
        Double averageRating = null;
        Integer reviewCount = null;

        if (unproxied instanceof Household household) {
            tokenBalance = household.getTokenBalance();
            address = household.getAddress();
            averageRating = household.getAverageRating();
            reviewCount = household.getReviewCount();
        } else if (unproxied instanceof Farmer farmer) {
            farmName = farmer.getFarmName();
            farmAddress = farmer.getFarmAddress();
            notes = farmer.getNotes();
            serviceRadiusKm = farmer.getServiceRadiusKm();
            maxDailyCapacityKg = farmer.getMaxDailyCapacityKg();
            averageRating = farmer.getAverageRating();
            reviewCount = farmer.getReviewCount();
        }

        return new UserApiResponse(
                unproxied.getId(),
                unproxied.getEmail(),
                unproxied.getFullName(),
                unproxied.getRole(),
                unproxied.isActive(),
                tokenBalance,
                unproxied.getCreatedAt(),
                address,
                farmName,
                farmAddress,
                notes,
                serviceRadiusKm,
                maxDailyCapacityKg,
                averageRating,
                reviewCount
        );
    }
}
