package com.agroloop.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * Form backing object for scheduling a collection appointment.
 */
public class SchedulePickupRequest {

    @NotNull(message = "Scheduled collection time is required")
    @Future(message = "Scheduled collection time must be strictly in the future")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime scheduledTime;

    public SchedulePickupRequest() {
    }

    public SchedulePickupRequest(LocalDateTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }

    public LocalDateTime getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(LocalDateTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }
}
