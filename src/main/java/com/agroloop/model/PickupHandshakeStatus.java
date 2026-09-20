package com.agroloop.model;

/**
 * Lifecycle state transitions for physical on-site pickup handshakes.
 *
 * State progression:
 * ISSUED ──► CONSUMED (on successful atomic verification by assigned farmer)
 * ISSUED ──► EXPIRED (when verification is attempted past expiresAt)
 * ISSUED ──► INVALIDATED (on replacement, pickup cancellation/dispute, or brute-force threshold)
 */
public enum PickupHandshakeStatus {
    ISSUED,
    CONSUMED,
    EXPIRED,
    INVALIDATED
}
