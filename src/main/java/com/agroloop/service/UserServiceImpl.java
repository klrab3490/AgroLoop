package com.agroloop.service;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.dto.RegisterRequest;
import com.agroloop.model.*;
import com.agroloop.repository.FarmerApplicationRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerApplicationRepository farmerApplicationRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public UserServiceImpl(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerApplicationRepository farmerApplicationRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.farmerApplicationRepository = farmerApplicationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public Household registerHousehold(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }

        if (!request.isPasswordMatching()) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        Household household = new Household(
                request.getName(),
                request.getEmail(),
                encodedPassword,
                request.getAddress()
        );

        Household saved = householdRepository.save(household);
        logger.info("Registered new default Household user: id={}, email={}", saved.getId(), saved.getEmail());
        return saved;
    }

    @Override
    @Transactional
    public FarmerApplication submitFarmerApplication(String userEmail, FarmerApplicationRequest request) {
        User user = userRepository.findByEmail(userEmail.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        if (user.getRole() == Role.ROLE_FARMER) {
            throw new IllegalStateException("You are already registered as a verified Farmer.");
        }

        if (farmerApplicationRepository.existsByUserIdAndStatus(user.getId(), FarmerApplicationStatus.PENDING)) {
            throw new IllegalStateException("You already have a pending farmer application under review.");
        }

        FarmerApplication application = new FarmerApplication(
                user,
                request.getFarmName(),
                request.getFarmAddress(),
                request.getNotes()
        );

        FarmerApplication saved = farmerApplicationRepository.save(application);
        logger.info("Created FarmerApplication id={} for user id={}, email={}", saved.getId(), user.getId(), user.getEmail());
        return saved;
    }

    @Override
    @Transactional
    public void approveFarmerApplication(Long applicationId) {
        FarmerApplication application = farmerApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        application.approve();
        farmerApplicationRepository.save(application);

        Long userId = application.getUser().getId();

        // 1. Update user role in base users table to ROLE_FARMER
        entityManager.createNativeQuery("UPDATE users SET role = 'ROLE_FARMER', updated_at = NOW() WHERE id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();

        // 2. Insert into or update farmers subtype table
        Number existingCount = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM farmers WHERE id = :userId")
                .setParameter("userId", userId)
                .getSingleResult();

        if (existingCount.intValue() == 0) {
            entityManager.createNativeQuery(
                            "INSERT INTO farmers (id, farm_name, farm_address, notes) VALUES (:userId, :farmName, :farmAddress, :notes)")
                    .setParameter("userId", userId)
                    .setParameter("farmName", application.getFarmName())
                    .setParameter("farmAddress", application.getFarmAddress())
                    .setParameter("notes", application.getNotes())
                    .executeUpdate();
        } else {
            entityManager.createNativeQuery(
                            "UPDATE farmers SET farm_name = :farmName, farm_address = :farmAddress, notes = :notes WHERE id = :userId")
                    .setParameter("userId", userId)
                    .setParameter("farmName", application.getFarmName())
                    .setParameter("farmAddress", application.getFarmAddress())
                    .setParameter("notes", application.getNotes())
                    .executeUpdate();
        }

        // Flush and clear 1st-level cache so subsequent queries fetch the updated entity
        entityManager.flush();
        entityManager.clear();

        logger.info("Approved FarmerApplication id={}, converted user id={} to ROLE_FARMER", applicationId, userId);
    }

    @Override
    @Transactional
    public void rejectFarmerApplication(Long applicationId, String reason) {
        FarmerApplication application = farmerApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found with ID: " + applicationId));

        application.reject(reason);
        farmerApplicationRepository.save(application);
        logger.info("Rejected FarmerApplication id={}, reason='{}'", applicationId, reason);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FarmerApplication> getPendingFarmerApplications() {
        return farmerApplicationRepository.findByStatusOrderByCreatedAtDesc(FarmerApplicationStatus.PENDING);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FarmerApplication> getLatestApplicationForUser(Long userId) {
        return farmerApplicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId);
    }
}
