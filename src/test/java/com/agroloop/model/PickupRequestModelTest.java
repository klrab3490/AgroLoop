package com.agroloop.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PickupRequestModelTest {

    private Household household;
    private Farmer farmer1;
    private Farmer farmer2;
    private WasteSubmission wasteSubmission;
    private PickupRequest pickupRequest;

    @BeforeEach
    void setUp() {
        household = new Household("Alice Smith", "alice@example.com", "hash123", "123 Green St");
        farmer1 = new Farmer("Bob Farmer", "bob@example.com", "hash123", "Bob's Organic Farm", "456 Farm Rd", "Composting specialist");
        farmer2 = new Farmer("Charlie Farmer", "charlie@example.com", "hash123", "Charlie's Orchard", "789 Orchard Ln", "Fruit composting");

        wasteSubmission = household.submitWaste(
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("5.50"),
                null,
                "/uploads/test.jpg",
                "Vegetable peels"
        );

        pickupRequest = new PickupRequest(wasteSubmission);
    }

    @Nested
    @DisplayName("Initial State & Validation")
    class InitialStateTests {

        @Test
        @DisplayName("New PickupRequest has status REQUESTED, null farmer, and eligible for cancellation")
        void initialProperties() {
            assertEquals(PickupStatus.REQUESTED, pickupRequest.getStatus());
            assertNull(pickupRequest.getAssignedFarmer());
            assertNull(pickupRequest.getScheduledTime());
            assertNull(pickupRequest.getCollectedAt());
            assertNull(pickupRequest.getCancelledAt());
            assertNull(pickupRequest.getVerification());
            assertTrue(pickupRequest.isEligibleForCancellation());
            assertFalse(pickupRequest.isTerminal());
            assertEquals(wasteSubmission, pickupRequest.getWasteSubmission());
        }

        @Test
        @DisplayName("Cannot construct PickupRequest with null WasteSubmission")
        void nullWasteSubmissionThrows() {
            assertThrows(NullPointerException.class, () -> new PickupRequest(null));
        }
    }

    @Nested
    @DisplayName("Farmer Accept / Claim Flow")
    class AcceptFlowTests {

        @Test
        @DisplayName("accept() assigns farmer, transitions status to ASSIGNED, and marks waste CLAIMED")
        void acceptHappyPath() {
            pickupRequest.accept(farmer1);

            assertEquals(PickupStatus.ASSIGNED, pickupRequest.getStatus());
            assertEquals(farmer1, pickupRequest.getAssignedFarmer());
            assertNull(pickupRequest.getDeclineReason());
            assertEquals(SubmissionStatus.CLAIMED, wasteSubmission.getStatus());
            assertTrue(pickupRequest.isEligibleForCancellation());
        }

        @Test
        @DisplayName("accept() fails when farmer is null")
        void acceptNullFarmerThrows() {
            assertThrows(NullPointerException.class, () -> pickupRequest.accept(null));
        }

        @Test
        @DisplayName("accept() fails when status is not REQUESTED")
        void acceptWhenAlreadyAssignedThrows() {
            pickupRequest.accept(farmer1);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.accept(farmer2));
            assertTrue(ex.getMessage().contains("Only REQUESTED pickups can be accepted"));
        }
    }

    @Nested
    @DisplayName("Scheduling Flow")
    class SchedulingFlowTests {

        @Test
        @DisplayName("schedule() sets valid future appointment and transitions to SCHEDULED")
        void scheduleHappyPath() {
            pickupRequest.accept(farmer1);
            LocalDateTime slot = LocalDateTime.now().plusDays(2);

            pickupRequest.schedule(slot);

            assertEquals(PickupStatus.SCHEDULED, pickupRequest.getStatus());
            assertEquals(slot, pickupRequest.getScheduledTime());
            assertTrue(pickupRequest.isEligibleForCancellation());
        }

        @Test
        @DisplayName("schedule() allows re-scheduling when already SCHEDULED")
        void rescheduleAllowed() {
            pickupRequest.accept(farmer1);
            LocalDateTime slot1 = LocalDateTime.now().plusDays(1);
            LocalDateTime slot2 = LocalDateTime.now().plusDays(3);

            pickupRequest.schedule(slot1);
            pickupRequest.schedule(slot2);

            assertEquals(PickupStatus.SCHEDULED, pickupRequest.getStatus());
            assertEquals(slot2, pickupRequest.getScheduledTime());
        }

        @Test
        @DisplayName("schedule() fails when status is REQUESTED (unassigned)")
        void scheduleWithoutAcceptingThrows() {
            LocalDateTime slot = LocalDateTime.now().plusDays(1);
            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.schedule(slot));
            assertTrue(ex.getMessage().contains("Only ASSIGNED or SCHEDULED pickups can be scheduled"));
        }

        @Test
        @DisplayName("schedule() fails when slot is in the past or now")
        void schedulePastTimeThrows() {
            pickupRequest.accept(farmer1);
            LocalDateTime pastSlot = LocalDateTime.now().minusHours(1);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> pickupRequest.schedule(pastSlot));
            assertTrue(ex.getMessage().contains("strictly in the future"));
        }

        @Test
        @DisplayName("schedule() fails when slot is null")
        void scheduleNullTimeThrows() {
            pickupRequest.accept(farmer1);
            assertThrows(NullPointerException.class, () -> pickupRequest.schedule(null));
        }
    }

    @Nested
    @DisplayName("Physical Collection Flow")
    class CollectionFlowTests {

        @Test
        @DisplayName("markCollected() succeeds only from SCHEDULED and updates WasteSubmission to COLLECTED")
        void markCollectedHappyPath() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));

            pickupRequest.markCollected();

            assertEquals(PickupStatus.COLLECTED, pickupRequest.getStatus());
            assertNotNull(pickupRequest.getCollectedAt());
            assertEquals(SubmissionStatus.COLLECTED, wasteSubmission.getStatus());
            assertFalse(pickupRequest.isEligibleForCancellation());
        }

        @Test
        @DisplayName("markCollected() fails if pickup is only ASSIGNED but not SCHEDULED")
        void markCollectedWhenAssignedThrows() {
            pickupRequest.accept(farmer1);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.markCollected());
            assertTrue(ex.getMessage().contains("Only SCHEDULED pickups can be collected"));
        }

        @Test
        @DisplayName("markCollected() fails if pickup is REQUESTED")
        void markCollectedWhenRequestedThrows() {
            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.markCollected());
            assertTrue(ex.getMessage().contains("Only SCHEDULED pickups can be collected"));
        }
    }

    @Nested
    @DisplayName("Post-Collection Verification Flow")
    class VerificationFlowTests {

        @Test
        @DisplayName("recordVerification() succeeds when COLLECTED and performed by assigned farmer")
        void recordVerificationHappyPath() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            WasteVerification verification = new WasteVerification(
                    pickupRequest,
                    farmer1,
                    new BigDecimal("5.20"),
                    QualityGrade.GRADE_A,
                    "High quality vegetable waste"
            );

            pickupRequest.recordVerification(verification);

            assertEquals(PickupStatus.VERIFIED, pickupRequest.getStatus());
            assertEquals(verification, pickupRequest.getVerification());
            assertEquals(SubmissionStatus.VERIFIED, wasteSubmission.getStatus());
            assertTrue(pickupRequest.isTerminal());
        }

        @Test
        @DisplayName("recordVerification() fails if called before collection")
        void recordVerificationBeforeCollectionThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));

            WasteVerification verification = new WasteVerification(
                    pickupRequest,
                    farmer1,
                    new BigDecimal("5.20"),
                    QualityGrade.GRADE_A,
                    "Inspection"
            );

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.recordVerification(verification));
            assertTrue(ex.getMessage().contains("Only COLLECTED pickups can be verified"));
        }

        @Test
        @DisplayName("recordVerification() fails if performed by a different farmer than assigned")
        void recordVerificationByUnassignedFarmerThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            WasteVerification verification = new WasteVerification(
                    pickupRequest,
                    farmer2, // different farmer!
                    new BigDecimal("5.20"),
                    QualityGrade.GRADE_A,
                    "Inspection"
            );

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.recordVerification(verification));
            assertTrue(ex.getMessage().contains("must be performed by the currently assigned farmer"));
        }

        @Test
        @DisplayName("recordVerification() fails if verification object is null")
        void recordVerificationNullThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            assertThrows(NullPointerException.class, () -> pickupRequest.recordVerification(null));
        }

        @Test
        @DisplayName("recordVerification() fails if verification belongs to a different pickup request")
        void recordVerificationBelongingToDifferentPickupThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            PickupRequest otherPickup = new PickupRequest(wasteSubmission);

            WasteVerification verification = new WasteVerification(
                    otherPickup,
                    farmer1,
                    new BigDecimal("5.20"),
                    QualityGrade.GRADE_A,
                    "Notes"
            );

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> pickupRequest.recordVerification(verification));
            assertTrue(ex.getMessage().contains("belongs to a different pickup request"));
        }
    }

    @Nested
    @DisplayName("Farmer Decline & Re-queue Flow")
    class DeclineFlowTests {

        @Test
        @DisplayName("decline() from ASSIGNED resets status to REQUESTED, unassigns farmer, and records reason and timestamp")
        void declineFromAssignedResetsToRequested() {
            pickupRequest.accept(farmer1);
            assertEquals(SubmissionStatus.CLAIMED, wasteSubmission.getStatus());
            assertNull(pickupRequest.getDeclinedAt());

            pickupRequest.decline("Truck breakdown in morning");

            assertEquals(PickupStatus.REQUESTED, pickupRequest.getStatus());
            assertNull(pickupRequest.getAssignedFarmer());
            assertNull(pickupRequest.getScheduledTime());
            assertEquals("Truck breakdown in morning", pickupRequest.getDeclineReason());
            assertNotNull(pickupRequest.getDeclinedAt());
            assertEquals(SubmissionStatus.SUBMITTED, wasteSubmission.getStatus());

            // Can now be claimed by farmer2
            pickupRequest.accept(farmer2);
            assertEquals(PickupStatus.ASSIGNED, pickupRequest.getStatus());
            assertEquals(farmer2, pickupRequest.getAssignedFarmer());
            assertNull(pickupRequest.getDeclineReason());
            assertNull(pickupRequest.getDeclinedAt());
        }

        @Test
        @DisplayName("decline() from SCHEDULED clears schedule, unassigns farmer, and resets to REQUESTED")
        void declineFromScheduledResetsToRequested() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));

            pickupRequest.decline("Operational emergency");

            assertEquals(PickupStatus.REQUESTED, pickupRequest.getStatus());
            assertNull(pickupRequest.getAssignedFarmer());
            assertNull(pickupRequest.getScheduledTime());
            assertEquals("Operational emergency", pickupRequest.getDeclineReason());
            assertNotNull(pickupRequest.getDeclinedAt());
            assertEquals(SubmissionStatus.SUBMITTED, wasteSubmission.getStatus());
        }

        @Test
        @DisplayName("decline() fails when status is REQUESTED (not assigned to any farmer)")
        void declineWhenRequestedThrows() {
            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.decline("Cannot attend"));
            assertTrue(ex.getMessage().contains("Only ASSIGNED or SCHEDULED pickups can be declined"));
        }

        @Test
        @DisplayName("decline() fails when status is COLLECTED or VERIFIED")
        void declineAfterCollectionThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.decline("Change mind"));
            assertTrue(ex.getMessage().contains("Only ASSIGNED or SCHEDULED pickups can be declined"));
        }

        @Test
        @DisplayName("decline() fails when reason is blank")
        void declineBlankReasonThrows() {
            pickupRequest.accept(farmer1);
            assertThrows(IllegalArgumentException.class, () -> pickupRequest.decline("   "));
        }
    }

    @Nested
    @DisplayName("Household Cancellation Flow")
    class CancellationFlowTests {

        @Test
        @DisplayName("cancel() succeeds when REQUESTED and updates WasteSubmission to CANCELLED with reason")
        void cancelFromRequested() {
            pickupRequest.cancel("Accidentally submitted wrong address");

            assertEquals(PickupStatus.CANCELLED, pickupRequest.getStatus());
            assertNotNull(pickupRequest.getCancelledAt());
            assertEquals("Accidentally submitted wrong address", pickupRequest.getCancellationReason());
            assertTrue(pickupRequest.isTerminal());
            assertFalse(pickupRequest.isEligibleForCancellation());
            assertEquals(SubmissionStatus.CANCELLED, wasteSubmission.getStatus());
            assertTrue(wasteSubmission.getRejectionReason().contains("Accidentally submitted wrong address"));
        }

        @Test
        @DisplayName("cancel() succeeds when ASSIGNED")
        void cancelFromAssigned() {
            pickupRequest.accept(farmer1);

            pickupRequest.cancel("Already composted in backyard");

            assertEquals(PickupStatus.CANCELLED, pickupRequest.getStatus());
            assertEquals("Already composted in backyard", pickupRequest.getCancellationReason());
        }

        @Test
        @DisplayName("cancel() succeeds when SCHEDULED")
        void cancelFromScheduled() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));

            pickupRequest.cancel("Moving out today");

            assertEquals(PickupStatus.CANCELLED, pickupRequest.getStatus());
        }

        @Test
        @DisplayName("cancel() fails when already COLLECTED")
        void cancelWhenCollectedThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.cancel("Changed mind"));
            assertTrue(ex.getMessage().contains("Pickup cannot be cancelled in status: COLLECTED"));
        }

        @Test
        @DisplayName("cancel() fails when already VERIFIED")
        void cancelWhenVerifiedThrows() {
            pickupRequest.accept(farmer1);
            pickupRequest.schedule(LocalDateTime.now().plusDays(1));
            pickupRequest.markCollected();
            pickupRequest.recordVerification(new WasteVerification(pickupRequest, farmer1, new BigDecimal("5.00"), QualityGrade.GRADE_B, null));

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> pickupRequest.cancel("Cancel please"));
            assertTrue(ex.getMessage().contains("Pickup cannot be cancelled in status: VERIFIED"));
        }

        @Test
        @DisplayName("cancel() fails when reason is null or blank")
        void cancelBlankReasonThrows() {
            assertThrows(IllegalArgumentException.class, () -> pickupRequest.cancel("   "));
        }
    }
}
