package com.agroloop.dto.api.v1.response;

import com.agroloop.model.Role;
import com.agroloop.model.User;

public record UserApiResponse(
        Long id,
        String email,
        String name,
        Role role,
        boolean enabled
) {
    public static UserApiResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new UserApiResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isActive()
        );
    }
}
