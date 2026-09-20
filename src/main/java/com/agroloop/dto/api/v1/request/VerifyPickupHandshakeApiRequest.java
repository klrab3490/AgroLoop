package com.agroloop.dto.api.v1.request;

import com.agroloop.dto.api.v1.response.CompactQrPayload;
import com.agroloop.model.HandshakeVerificationMethod;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for verifying an on-site physical collection handshake.
 * Supports either QR scan payload or manual passcode fallback.
 */
public record VerifyPickupHandshakeApiRequest(
        @NotNull(message = "Verification method is required")
        HandshakeVerificationMethod method,

        CompactQrPayload payload,

        String passCode
) {
    public static VerifyPickupHandshakeApiRequest forQr(CompactQrPayload payload) {
        return new VerifyPickupHandshakeApiRequest(HandshakeVerificationMethod.QR_SCAN, payload, null);
    }

    public static VerifyPickupHandshakeApiRequest forPassCode(String passCode) {
        return new VerifyPickupHandshakeApiRequest(HandshakeVerificationMethod.MANUAL_PASSCODE, null, passCode);
    }
}
