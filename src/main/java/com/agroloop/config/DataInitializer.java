package com.agroloop.config;

import com.agroloop.model.Admin;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            UserRepository userRepository,
            AdminRepository adminRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminUser();
        seedHouseholdUser();
        seedFarmerUser();
    }

    private void seedAdminUser() {
        String email = "admin@agroloop.com";
        if (!userRepository.existsByEmail(email)) {
            Admin admin = new Admin(
                    "System Administrator",
                    email,
                    passwordEncoder.encode("admin123")
            );
            adminRepository.save(admin);
            logger.info("Seeded default Admin user: {} / admin123", email);
        }
    }

    private void seedHouseholdUser() {
        String email = "household@agroloop.com";
        if (!userRepository.existsByEmail(email)) {
            Household household = new Household(
                    "Alice Green",
                    email,
                    passwordEncoder.encode("household123"),
                    "Green View Residency, Kochi, Kerala"
            );
            household.addTokens(new BigDecimal("150.00"));
            householdRepository.save(household);
            logger.info("Seeded default Household user: {} / household123", email);
        }
    }

    private void seedFarmerUser() {
        String email = "farmer@agroloop.com";
        if (!userRepository.existsByEmail(email)) {
            Farmer farmer = new Farmer(
                    "Bob Farmer",
                    email,
                    passwordEncoder.encode("farmer123"),
                    "Green Valley Organic Farm",
                    "Wayanad Agro Zone, Kerala",
                    "Certified organic farm specializing in vegetables and composting."
            );
            farmerRepository.save(farmer);
            logger.info("Seeded default Farmer user: {} / farmer123", email);
        }
    }
}
