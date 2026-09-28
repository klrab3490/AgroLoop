package com.agroloop.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public final class NotificationEvents {

    private NotificationEvents() {
    }

    public record PickupClaimedEvent(
            Long pickupId,
            Long farmerId,
            String farmName,
            Long householdId,
            String category
    ) {}

    public record PickupScheduledEvent(
            Long pickupId,
            Long householdId,
            LocalDateTime scheduledTime,
            String farmName
    ) {}

    public record PickupCollectedEvent(
            Long pickupId,
            Long householdId,
            Long farmerId
    ) {}

    public record TokensMintedEvent(
            Long householdId,
            BigDecimal tokens,
            String reason
    ) {}

    public record OrderPlacedEvent(
            Long orderId,
            Long householdId,
            Long farmerId,
            BigDecimal totalTokens
    ) {}

    public record ReviewReceivedEvent(
            Long reviewId,
            Long reviewerId,
            String reviewerName,
            Long revieweeId,
            int rating,
            String type
    ) {}
}
