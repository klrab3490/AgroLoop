package com.agroloop.dto.api.v1.response;

import java.time.Instant;

/**
 * Server-issued physical handshake credential for a pickup request.
 */
public record PickupHandshakePassResponse(
        String type,
        int version,
        Long pickupId,
        Long householdId,
        Long submissionId,
        long issuedAt,
        long expiresAt,
        String nonce,
        String passCode,
        String signature,
        CompactQrPayload compactQr
) {
    public static PickupHandshakePassResponse of(
            Long pickupId,
            Long householdId,
            Long submissionId,
            Instant issuedAt,
            Instant expiresAt,
            String nonce,
            String passCode,
            String signature
    ) {
        long iat = issuedAt.toEpochMilli();
        long exp = expiresAt.toEpochMilli();
        CompactQrPayload compact = new CompactQrPayload(
                "AGROLOOP_PICKUP_HANDSHAKE",
                1,
                pickupId,
                householdId,
                submissionId,
                iat,
                exp,
                nonce,
                passCode,
                signature
        );
        return new PickupHandshakePassResponse(
                "AGROLOOP_PICKUP_HANDSHAKE",
                1,
                pickupId,
                householdId,
                submissionId,
                iat,
                exp,
                nonce,
                passCode,
                signature,
                compact
        );
    }
}
