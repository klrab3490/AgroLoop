package com.agroloop.service.notification;

import com.agroloop.event.NotificationEvents;
import com.agroloop.model.NotificationType;
import com.agroloop.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
public class NotificationEventListener {

    private static final Logger logger = LoggerFactory.getLogger(NotificationEventListener.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener
    public void onPickupClaimed(NotificationEvents.PickupClaimedEvent event) {
        logger.info("Handling PickupClaimedEvent for pickup={}", event.pickupId());
        String msg = String.format("Farmer '%s' has claimed your %s waste pickup #%d.",
                event.farmName(), event.category(), event.pickupId());

        notificationService.sendNotification(
                event.householdId(),
                "🚜 Pickup Claimed",
                msg,
                NotificationType.PICKUP_CLAIMED,
                "/household/dashboard"
        );
    }

    @EventListener
    public void onPickupScheduled(NotificationEvents.PickupScheduledEvent event) {
        logger.info("Handling PickupScheduledEvent for pickup={}", event.pickupId());
        String timeStr = event.scheduledTime() != null ? event.scheduledTime().format(DATE_TIME_FORMATTER) : "soon";
        String msg = String.format("Farmer '%s' confirmed collection appointment for %s (Pickup #%d).",
                event.farmName(), timeStr, event.pickupId());

        notificationService.sendNotification(
                event.householdId(),
                "📅 Pickup Scheduled",
                msg,
                NotificationType.PICKUP_SCHEDULED,
                "/household/dashboard"
        );
    }

    @EventListener
    public void onPickupCollected(NotificationEvents.PickupCollectedEvent event) {
        logger.info("Handling PickupCollectedEvent for pickup={}", event.pickupId());
        notificationService.sendNotification(
                event.householdId(),
                "📦 Waste Collected",
                "Your waste collection has been physically retrieved. Leave feedback to rate your farmer!",
                NotificationType.PICKUP_COLLECTED,
                "/reviews/pickup/" + event.pickupId() + "/new"
        );
    }

    @EventListener
    public void onTokensMinted(NotificationEvents.TokensMintedEvent event) {
        logger.info("Handling TokensMintedEvent for household={}", event.householdId());
        String msg = String.format("You earned %s EcoTokens for %s!", event.tokens(), event.reason());

        notificationService.sendNotification(
                event.householdId(),
                "🪙 EcoTokens Earned!",
                msg,
                NotificationType.TOKENS_MINTED,
                "/household/dashboard"
        );
    }

    @EventListener
    public void onOrderPlaced(NotificationEvents.OrderPlacedEvent event) {
        logger.info("Handling OrderPlacedEvent for order={}", event.orderId());
        String msg = String.format("Order #%d received for %s tokens.", event.orderId(), event.totalTokens());

        notificationService.sendNotification(
                event.farmerId(),
                "🛒 New Produce Order",
                msg,
                NotificationType.ORDER_PLACED,
                "/farmer/orders"
        );
    }

    @EventListener
    public void onReviewReceived(NotificationEvents.ReviewReceivedEvent event) {
        logger.info("Handling ReviewReceivedEvent for reviewee={}", event.revieweeId());
        String msg = String.format("%s gave you a %d-star rating for %s.",
                event.reviewerName(), event.rating(), event.type());

        notificationService.sendNotification(
                event.revieweeId(),
                "⭐ New Trust Rating Received",
                msg,
                NotificationType.NEW_REVIEW,
                "/reviews/farmer/" + event.revieweeId()
        );
    }
}
