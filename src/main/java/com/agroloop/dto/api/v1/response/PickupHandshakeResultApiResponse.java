package com.agroloop.dto.api.v1.response;

import com.agroloop.model.HandshakeVerificationMethod;
import java.time.Instant;

/**
 * Authoritative response returned upon successful verification of an on-site handshake.
 */
public record PickupHandshakeResultApiResponse(
        boolean verified,
        Long handshakeId,
        Long pickupId,
        Long householdId,
        Long farmerId,
        HandshakeVerificationMethod method,
        Instant verifiedAt
) {
    public static PickupHandshakeResultApiResponse of(
            Long handshakeId,
            Long pickupId,
            Long householdId,
            Long farmerId,
            HandshakeVerificationMethod method,
            Instant verifiedAt
    ) {
        return new PickupHandshakeResultApiResponse(
                true,
                handshakeId,
                pickupId,
                householdId,
                farmerId,
                method,
                verifiedAt
        );
    }
}
