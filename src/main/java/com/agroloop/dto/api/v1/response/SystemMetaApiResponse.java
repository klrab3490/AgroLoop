package com.agroloop.dto.api.v1.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Public system metadata response DTO used for client-server compatibility checks.
 */
public record SystemMetaApiResponse(
    String status,
    String service,
    @JsonProperty("api_version") String apiVersion,
    @JsonProperty("minimum_client_version") String minimumClientVersion,
    @JsonProperty("server_version") String serverVersion
) {}
