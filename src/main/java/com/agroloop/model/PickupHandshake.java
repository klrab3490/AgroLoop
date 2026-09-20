package com.agroloop.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;

/**
 * Domain entity serving as the authoritative audit record for physical on-site collection handshakes.
 * Encapsulates the handshake lifecycle:
 * ISSUED ──► CONSUMED (on successful atomic verification by assigned farmer)
 * ISSUED ──► EXPIRED (when attempted after expiresAt)
 * ISSUED ──► INVALIDATED (on replacement, cancellation, or brute-force threshold)
 */
@Entity
@Table(name = "pickup_handshakes", indexes = {
        @Index(name = "idx_pickup_handshakes_nonce", columnList = "nonce", unique = true),
        @Index(name = "idx_pickup_handshakes_pickup_status", columnList = "pickup_id, status"),
        @Index(name = "idx_pickup_handshakes_farmer", columnList = "farmer_id")
})
public class PickupHandshake {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pickup_id", nullable = false)
    private PickupRequest pickup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_id")
    private Farmer farmer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PickupHandshakeStatus status = PickupHandshakeStatus.ISSUED;

    @Column(nullable = false, unique = true, length = 64)
    private String nonce;

    @Column(name = "pass_code_hash", nullable = false, length = 64)
    private String passCodeHash;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "invalidated_at")
    private Instant invalidatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", length = 32)
    private HandshakeVerificationMethod verificationMethod;

    @Column(nullable = false, length = 128)
    private String signature;

    protected PickupHandshake() {
        // JPA required
    }

    public PickupHandshake(
            PickupRequest pickup,
            Household household,
            String nonce,
            String passCodeHash,
            Instant issuedAt,
            Instant expiresAt,
            String signature
    ) {
        this.pickup = Objects.requireNonNull(pickup, "Pickup cannot be null");
        this.household = Objects.requireNonNull(household, "Household cannot be null");
        this.nonce = Objects.requireNonNull(nonce, "Nonce cannot be null");
        this.passCodeHash = Objects.requireNonNull(passCodeHash, "PassCodeHash cannot be null");
        this.issuedAt = Objects.requireNonNull(issuedAt, "IssuedAt cannot be null");
        this.expiresAt = Objects.requireNonNull(expiresAt, "ExpiresAt cannot be null");
        this.signature = Objects.requireNonNull(signature, "Signature cannot be null");
        this.status = PickupHandshakeStatus.ISSUED;
        this.failedAttempts = 0;
    }

    // --- State Transitions ---

    public void markConsumed(Farmer verifiedByFarmer, HandshakeVerificationMethod method) {
        if (this.status != PickupHandshakeStatus.ISSUED) {
            throw new IllegalStateException("Only ISSUED handshakes can be consumed. Current status: " + this.status);
        }
        this.status = PickupHandshakeStatus.CONSUMED;
        this.consumedAt = Instant.now();
        this.farmer = Objects.requireNonNull(verifiedByFarmer, "Verified by farmer cannot be null");
        this.verificationMethod = Objects.requireNonNull(method, "Verification method cannot be null");
    }

    public void markExpired() {
        if (this.status == PickupHandshakeStatus.ISSUED) {
            this.status = PickupHandshakeStatus.EXPIRED;
        }
    }

    public void markInvalidated() {
        if (this.status == PickupHandshakeStatus.ISSUED) {
            this.status = PickupHandshakeStatus.INVALIDATED;
            this.invalidatedAt = Instant.now();
        }
    }

    public void incrementFailedAttempts() {
        this.failedAttempts++;
        if (this.failedAttempts >= 5) {
            markInvalidated();
        }
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public PickupRequest getPickup() {
        return pickup;
    }

    public Household getHousehold() {
        return household;
    }

    public Farmer getFarmer() {
        return farmer;
    }

    public PickupHandshakeStatus getStatus() {
        return status;
    }

    public String getNonce() {
        return nonce;
    }

    public String getPassCodeHash() {
        return passCodeHash;
    }

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConsumedAt() {
        return consumedAt;
    }

    public Instant getInvalidatedAt() {
        return invalidatedAt;
    }

    public HandshakeVerificationMethod getVerificationMethod() {
        return verificationMethod;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }
}
