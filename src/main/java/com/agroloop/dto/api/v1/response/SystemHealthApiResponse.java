package com.agroloop.dto.api.v1.response;

/**
 * Public health check response DTO.
 */
public record SystemHealthApiResponse(
    String status,
    String service
) {}
