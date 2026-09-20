package com.agroloop.dto.api.v1.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record SchedulePickupApiRequest(
        @NotNull(message = "Scheduled time is required")
        @Future(message = "Scheduled time must be in the future")
        LocalDateTime scheduledTime,

        @Size(max = 500, message = "Notes cannot exceed 500 characters")
        String farmerNotes
) {}
