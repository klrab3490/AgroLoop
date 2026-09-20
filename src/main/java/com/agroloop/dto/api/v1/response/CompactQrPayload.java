package com.agroloop.dto.api.v1.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Compact, low-density QR payload representation.
 * Keys are intentionally short to minimize visual density of rendered QR codes.
 */
public record CompactQrPayload(
        @JsonProperty("t") String t,
        @JsonProperty("v") int v,
        @JsonProperty("p") Long p,
        @JsonProperty("h") Long h,
        @JsonProperty("s") Long s,
        @JsonProperty("iat") long iat,
        @JsonProperty("exp") long exp,
        @JsonProperty("n") String n,
        @JsonProperty("c") String c,
        @JsonProperty("sig") String sig
) {
}
