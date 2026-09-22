package com.agroloop.dto.api.v1.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public record UserStatusApiRequest(
        @JsonProperty("enabled")
        @JsonAlias("active")
        Boolean enabled
) {
    public boolean isEnabled() {
        return enabled != null ? enabled : true;
    }
}
