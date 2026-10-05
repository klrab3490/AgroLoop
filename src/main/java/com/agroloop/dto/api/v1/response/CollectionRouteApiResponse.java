package com.agroloop.dto.api.v1.response;

import com.agroloop.model.CollectionRoute;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CollectionRouteApiResponse(
        Long id,
        Long farmerId,
        LocalDate routeDate,
        String status,
        Double totalDistanceKm,
        Double totalEstimatedWeightKg,
        String notes,
        List<RouteStopApiResponse> stops,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Double farmerLatitude,
        Double farmerLongitude,
        String farmerAddress
) {
    public static CollectionRouteApiResponse from(CollectionRoute route) {
        if (route == null) return null;
        List<RouteStopApiResponse> stops = route.getStops() != null
                ? route.getStops().stream().map(RouteStopApiResponse::from).toList()
                : List.of();

        Double farmerLat = route.getFarmer() != null ? route.getFarmer().getLatitude() : null;
        Double farmerLng = route.getFarmer() != null ? route.getFarmer().getLongitude() : null;
        String farmAddress = route.getFarmer() != null ? route.getFarmer().getFarmAddress() : null;

        return new CollectionRouteApiResponse(
                route.getId(),
                route.getFarmer() != null ? route.getFarmer().getId() : null,
                route.getRouteDate(),
                route.getStatus().name(),
                route.getTotalDistanceKm(),
                route.getTotalEstimatedWeight() != null ? route.getTotalEstimatedWeight().doubleValue() : 0.0,
                route.getNotes(),
                stops,
                route.getCreatedAt(),
                route.getUpdatedAt(),
                farmerLat,
                farmerLng,
                farmAddress
        );
    }
}
