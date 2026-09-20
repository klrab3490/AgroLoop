package com.agroloop.security.authorization;

import com.agroloop.model.PickupRequest;
import com.agroloop.model.User;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;

@Component("pickupAuth")
public class PickupSecurityEvaluator {

    private final PickupRequestRepository pickupRequestRepository;
    private final UserRepository userRepository;

    public PickupSecurityEvaluator(PickupRequestRepository pickupRequestRepository, UserRepository userRepository) {
        this.pickupRequestRepository = pickupRequestRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public boolean canAccessPickup(Authentication auth, Long pickupId) {
        if (auth == null || pickupId == null) {
            return false;
        }
        if (isAdmin(auth)) {
            return true;
        }

        Optional<PickupRequest> pickupOpt = pickupRequestRepository.findById(pickupId);
        if (pickupOpt.isEmpty()) {
            return false;
        }
        PickupRequest pickup = pickupOpt.get();
        Long userId = extractUserId(auth);
        if (userId == null) {
            return false;
        }

        // Household owner
        if (pickup.getWasteSubmission() != null && pickup.getWasteSubmission().getHousehold() != null) {
            if (Objects.equals(pickup.getWasteSubmission().getHousehold().getId(), userId)) {
                return true;
            }
        }

        // Assigned farmer
        return pickup.getAssignedFarmer() != null && Objects.equals(pickup.getAssignedFarmer().getId(), userId);
    }

    @Transactional(readOnly = true)
    public boolean canCancelPickupAsHousehold(Authentication auth, Long pickupId) {
        if (auth == null || pickupId == null) {
            return false;
        }
        Optional<PickupRequest> pickupOpt = pickupRequestRepository.findById(pickupId);
        if (pickupOpt.isEmpty()) {
            return false;
        }
        PickupRequest pickup = pickupOpt.get();
        Long userId = extractUserId(auth);
        return userId != null && pickup.getWasteSubmission() != null &&
                pickup.getWasteSubmission().getHousehold() != null &&
                Objects.equals(pickup.getWasteSubmission().getHousehold().getId(), userId);
    }

    public boolean canClaimPickupAsFarmer(Authentication auth, Long pickupId) {
        if (auth == null || pickupId == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FARMER"));
    }

    @Transactional(readOnly = true)
    public boolean canSchedulePickupAsFarmer(Authentication auth, Long pickupId) {
        return isAssignedFarmer(auth, pickupId);
    }

    @Transactional(readOnly = true)
    public boolean canVerifyPickupAsFarmer(Authentication auth, Long pickupId) {
        return isAssignedFarmer(auth, pickupId);
    }

    private boolean isAssignedFarmer(Authentication auth, Long pickupId) {
        if (auth == null || pickupId == null) {
            return false;
        }
        Optional<PickupRequest> pickupOpt = pickupRequestRepository.findById(pickupId);
        if (pickupOpt.isEmpty()) {
            return false;
        }
        PickupRequest pickup = pickupOpt.get();
        Long userId = extractUserId(auth);
        return userId != null && pickup.getAssignedFarmer() != null &&
                Objects.equals(pickup.getAssignedFarmer().getId(), userId);
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    public Long extractUserId(Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            Object uid = jwt.getClaim("uid");
            if (uid instanceof Number num) {
                return num.longValue();
            }
            try {
                return Long.parseLong(jwt.getSubject());
            } catch (NumberFormatException e) {
                // fallback
            }
        }
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        return userOpt.map(User::getId).orElse(null);
    }
}
