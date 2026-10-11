package com.agroloop.service;

import com.agroloop.dto.FarmerApplicationRequest;
import com.agroloop.dto.RegisterRequest;
import com.agroloop.model.*;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.FarmerApplicationRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private final FarmerRepository farmerRepository;
    private final AdminRepository adminRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public UserServiceImpl(
            UserRepository userRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            AdminRepository adminRepository,
            FarmerApplicationRepository farmerApplicationRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
        this.adminRepository = adminRepository;
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
                            "INSERT INTO farmers (id, farm_name, farm_address, notes, service_radius_km, max_daily_capacity_kg, average_rating, review_count) VALUES (:userId, :farmName, :farmAddress, :notes, 25.0, 200.00, 0.00, 0)")
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

        // 3. Remove entry from households table if user was converted from Household role
        entityManager.createNativeQuery("DELETE FROM households WHERE id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();

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
    @Transactional
    public User convertUserToFarmer(Long userId, String farmName, String farmAddress, String notes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        if (user.getRole() == Role.ROLE_FARMER) {
            throw new IllegalStateException("User is already registered as a verified Farmer.");
        }

        // 1. Update user role in base users table to ROLE_FARMER
        entityManager.createNativeQuery("UPDATE users SET role = 'ROLE_FARMER', updated_at = NOW() WHERE id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();

        // 2. Insert into or update farmers subtype table
        Number existingCount = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM farmers WHERE id = :userId")
                .setParameter("userId", userId)
                .getSingleResult();

        String resolvedFarmName = (farmName != null && !farmName.isBlank()) ? farmName.trim() : user.getName() + " Farm";
        String resolvedFarmAddress = (farmAddress != null && !farmAddress.isBlank()) ? farmAddress.trim() : "Registered Address";
        String resolvedNotes = (notes != null && !notes.isBlank()) ? notes.trim() : "Converted to Farmer by Administrator";

        if (existingCount.intValue() == 0) {
            entityManager.createNativeQuery(
                            "INSERT INTO farmers (id, farm_name, farm_address, notes, service_radius_km, max_daily_capacity_kg, average_rating, review_count) VALUES (:userId, :farmName, :farmAddress, :notes, 25.0, 200.00, 0.00, 0)")
                    .setParameter("userId", userId)
                    .setParameter("farmName", resolvedFarmName)
                    .setParameter("farmAddress", resolvedFarmAddress)
                    .setParameter("notes", resolvedNotes)
                    .executeUpdate();
        } else {
            entityManager.createNativeQuery(
                            "UPDATE farmers SET farm_name = :farmName, farm_address = :farmAddress, notes = :notes WHERE id = :userId")
                    .setParameter("userId", userId)
                    .setParameter("farmName", resolvedFarmName)
                    .setParameter("farmAddress", resolvedFarmAddress)
                    .setParameter("notes", resolvedNotes)
                    .executeUpdate();
        }

        // 3. Remove entry from households table if user was converted from Household role
        entityManager.createNativeQuery("DELETE FROM households WHERE id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();

        // 4. If there are any pending applications for this user, approve them
        farmerApplicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(app -> {
            if (app.getStatus() == FarmerApplicationStatus.PENDING) {
                app.approve();
                farmerApplicationRepository.save(app);
            }
        });

        // Flush and clear 1st-level cache so subsequent queries fetch the updated entity
        entityManager.flush();
        entityManager.clear();

        logger.info("Directly converted user id={} to ROLE_FARMER with farmName='{}'", userId, resolvedFarmName);
        return userRepository.findById(userId).orElseThrow();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FarmerApplication> getLatestApplicationForUser(Long userId) {
        return farmerApplicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    @Transactional
    public User createUser(com.agroloop.dto.api.v1.request.CreateUserApiRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("An account with email " + normalizedEmail + " already exists.");
        }

        String rawPassword = (request.password() != null && !request.password().isBlank())
                ? request.password().trim()
                : "ecoNexus2026!";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        Role role = request.role() != null ? request.role() : Role.ROLE_HOUSEHOLD;

        User savedUser;
        switch (role) {
            case ROLE_ADMIN -> {
                com.agroloop.model.Admin admin = new com.agroloop.model.Admin(request.name().trim(), normalizedEmail, encodedPassword);
                savedUser = adminRepository.save(admin);
            }
            case ROLE_FARMER -> {
                String farmName = (request.farmName() != null && !request.farmName().isBlank())
                        ? request.farmName().trim()
                        : request.name().trim() + "'s Farm";
                String farmAddress = (request.farmAddress() != null && !request.farmAddress().isBlank())
                        ? request.farmAddress().trim()
                        : (request.address() != null && !request.address().isBlank() ? request.address().trim() : "Registered Farm Address");
                com.agroloop.model.Farmer farmer = new com.agroloop.model.Farmer(request.name().trim(), normalizedEmail, encodedPassword, farmName, farmAddress, request.notes());
                savedUser = farmerRepository.save(farmer);
            }
            case ROLE_HOUSEHOLD -> {
                String address = (request.address() != null && !request.address().isBlank())
                        ? request.address().trim()
                        : "Household Residence";
                Household household = new Household(request.name().trim(), normalizedEmail, encodedPassword, address);
                if (request.initialTokens() != null && request.initialTokens().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    household.addTokens(request.initialTokens());
                }
                savedUser = householdRepository.save(household);
            }
            default -> throw new IllegalArgumentException("Unsupported role: " + role);
        }

        logger.info("Admin created new user id={}, email={}, role={}", savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
        return savedUser;
    }

    @Override
    @Transactional
    public User updateUserRole(Long userId, Role newRole, String address, String farmName, String farmAddress, String notes, String adminEmail) {
        if (newRole == null) {
            throw new IllegalArgumentException("Target role cannot be null");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        Role currentRole = user.getRole();
        if (currentRole == newRole) {
            return user;
        }

        // Concurrency-safe Last-Admin guard if demoting an active admin
        if (currentRole == Role.ROLE_ADMIN && user.isEnabled()) {
            List<User> activeAdmins = userRepository.findActiveUsersByRoleForUpdate(Role.ROLE_ADMIN);
            if (activeAdmins.size() <= 1) {
                throw new IllegalStateException("Safety Guard: Cannot demote the sole remaining active administrator account.");
            }
        }

        // 1. Update base users table role
        entityManager.createNativeQuery("UPDATE users SET role = :newRole, updated_at = NOW() WHERE id = :userId")
                .setParameter("newRole", newRole.name())
                .setParameter("userId", userId)
                .executeUpdate();

        // 2. Ensure row in target role table
        switch (newRole) {
            case ROLE_FARMER -> {
                Number farmerCount = (Number) entityManager.createNativeQuery(
                                "SELECT COUNT(*) FROM farmers WHERE id = :userId")
                        .setParameter("userId", userId)
                        .getSingleResult();

                String resolvedFarmName = (farmName != null && !farmName.isBlank()) ? farmName.trim() : user.getName() + "'s Farm";
                String resolvedFarmAddress = (farmAddress != null && !farmAddress.isBlank()) ? farmAddress.trim() : (address != null && !address.isBlank() ? address.trim() : "Registered Farm Location");
                String resolvedNotes = (notes != null && !notes.isBlank()) ? notes.trim() : "Role updated to Farmer by admin " + adminEmail;

                if (farmerCount.intValue() == 0) {
                    entityManager.createNativeQuery(
                                    "INSERT INTO farmers (id, farm_name, farm_address, notes, service_radius_km, max_daily_capacity_kg, average_rating, review_count) VALUES (:userId, :farmName, :farmAddress, :notes, 25.0, 200.00, 0.00, 0)")
                            .setParameter("userId", userId)
                            .setParameter("farmName", resolvedFarmName)
                            .setParameter("farmAddress", resolvedFarmAddress)
                            .setParameter("notes", resolvedNotes)
                            .executeUpdate();
                } else {
                    entityManager.createNativeQuery(
                                    "UPDATE farmers SET farm_name = :farmName, farm_address = :farmAddress, notes = :notes WHERE id = :userId")
                            .setParameter("userId", userId)
                            .setParameter("farmName", resolvedFarmName)
                            .setParameter("farmAddress", resolvedFarmAddress)
                            .setParameter("notes", resolvedNotes)
                            .executeUpdate();
                }

                // If user had a pending farmer application, approve it
                farmerApplicationRepository.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(app -> {
                    if (app.getStatus() == FarmerApplicationStatus.PENDING) {
                        app.approve();
                        farmerApplicationRepository.save(app);
                    }
                });
            }
            case ROLE_HOUSEHOLD -> {
                Number householdCount = (Number) entityManager.createNativeQuery(
                                "SELECT COUNT(*) FROM households WHERE id = :userId")
                        .setParameter("userId", userId)
                        .getSingleResult();

                String resolvedAddress = (address != null && !address.isBlank()) ? address.trim() : "Household Community Residence";
                if (householdCount.intValue() == 0) {
                    entityManager.createNativeQuery(
                                    "INSERT INTO households (id, token_balance, address, average_rating, review_count) VALUES (:userId, 0.00, :address, 0.00, 0)")
                            .setParameter("userId", userId)
                            .setParameter("address", resolvedAddress)
                            .executeUpdate();
                }
            }
            case ROLE_ADMIN -> {
                Number adminCount = (Number) entityManager.createNativeQuery(
                                "SELECT COUNT(*) FROM admins WHERE id = :userId")
                        .setParameter("userId", userId)
                        .getSingleResult();

                if (adminCount.intValue() == 0) {
                    entityManager.createNativeQuery(
                                    "INSERT INTO admins (id) VALUES (:userId)")
                            .setParameter("userId", userId)
                            .executeUpdate();
                }
            }
        }

        entityManager.flush();
        entityManager.clear();

        logger.info("Admin {} updated user id={} role from {} to {}", adminEmail, userId, currentRole, newRole);
        return userRepository.findById(userId).orElseThrow();
    }
}
