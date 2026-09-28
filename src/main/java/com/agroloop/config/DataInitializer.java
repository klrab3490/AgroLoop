package com.agroloop.config;

import com.agroloop.model.Admin;
import com.agroloop.model.CollectionRoute;
import com.agroloop.model.EcoTokenTransaction;
import com.agroloop.model.Farmer;
import com.agroloop.model.Household;
import com.agroloop.model.Notification;
import com.agroloop.model.NotificationType;
import com.agroloop.model.Order;
import com.agroloop.model.OrderItem;
import com.agroloop.model.OrderStatus;
import com.agroloop.model.PickupRequest;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.Review;
import com.agroloop.model.ReviewType;
import com.agroloop.model.RouteStatus;
import com.agroloop.model.RouteStop;
import com.agroloop.model.SubmissionStatus;
import com.agroloop.model.TransactionDirection;
import com.agroloop.model.WasteCategory;
import com.agroloop.model.WasteSubmission;
import com.agroloop.model.WasteVerification;
import com.agroloop.repository.AdminRepository;
import com.agroloop.repository.CollectionRouteRepository;
import com.agroloop.repository.EcoTokenTransactionRepository;
import com.agroloop.repository.FarmerRepository;
import com.agroloop.repository.HouseholdRepository;
import com.agroloop.repository.NotificationRepository;
import com.agroloop.repository.OrderItemRepository;
import com.agroloop.repository.OrderRepository;
import com.agroloop.repository.PickupRequestRepository;
import com.agroloop.repository.ProductRepository;
import com.agroloop.repository.ReviewRepository;
import com.agroloop.repository.RouteStopRepository;
import com.agroloop.repository.UserRepository;
import com.agroloop.repository.WasteSubmissionRepository;
import com.agroloop.repository.WasteVerificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final HouseholdRepository householdRepository;
    private final FarmerRepository farmerRepository;
    private final ProductRepository productRepository;
    private final WasteSubmissionRepository wasteSubmissionRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final WasteVerificationRepository wasteVerificationRepository;
    private final EcoTokenTransactionRepository ecoTokenTransactionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final CollectionRouteRepository collectionRouteRepository;
    private final RouteStopRepository routeStopRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${agroloop.seed.full-data:true}")
    private boolean seedFullData;

    public DataInitializer(
            UserRepository userRepository,
            AdminRepository adminRepository,
            HouseholdRepository householdRepository,
            FarmerRepository farmerRepository,
            ProductRepository productRepository,
            WasteSubmissionRepository wasteSubmissionRepository,
            PickupRequestRepository pickupRequestRepository,
            WasteVerificationRepository wasteVerificationRepository,
            EcoTokenTransactionRepository ecoTokenTransactionRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ReviewRepository reviewRepository,
            NotificationRepository notificationRepository,
            CollectionRouteRepository collectionRouteRepository,
            RouteStopRepository routeStopRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.householdRepository = householdRepository;
        this.farmerRepository = farmerRepository;
        this.productRepository = productRepository;
        this.wasteSubmissionRepository = wasteSubmissionRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.wasteVerificationRepository = wasteVerificationRepository;
        this.ecoTokenTransactionRepository = ecoTokenTransactionRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.reviewRepository = reviewRepository;
        this.notificationRepository = notificationRepository;
        this.collectionRouteRepository = collectionRouteRepository;
        this.routeStopRepository = routeStopRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Admin admin = seedAdminUser();
        Household household = seedHouseholdUser(admin);
        Farmer farmer = seedFarmerUser();

        if (seedFullData) {
            List<Product> products = seedProducts(farmer);
            PickupRequest verifiedPickup = seedWasteSubmissionsAndPickups(household, farmer);
            Order completedOrder = seedMarketplaceOrders(household, products, farmer);
            seedReviews(household, farmer, verifiedPickup, completedOrder);
            seedRoutes(farmer, verifiedPickup);
            seedNotifications(household, farmer);
        }
    }

    private Admin seedAdminUser() {
        String email = "admin@agroloop.com";
        return adminRepository.findByEmail(email).orElseGet(() -> {
            Admin admin = new Admin(
                    "System Administrator",
                    email,
                    passwordEncoder.encode("admin123")
            );
            Admin saved = adminRepository.save(admin);
            logger.info("Seeded default Admin user: {} / admin123", email);
            return saved;
        });
    }

    private Household seedHouseholdUser(Admin admin) {
        String email = "household@agroloop.com";
        return householdRepository.findByEmail(email).orElseGet(() -> {
            Household household = new Household(
                    "Alice Green",
                    email,
                    passwordEncoder.encode("household123"),
                    "Green View Residency, Kochi, Kerala"
            );
            household.updateReputation(5.0, 1);
            Household saved = householdRepository.save(household);

            BigDecimal grant = new BigDecimal("150.00");
            saved.addTokens(grant);
            Household updated = householdRepository.save(saved);

            if (seedFullData) {
                EcoTokenTransaction genesisTx = EcoTokenTransaction.adminAdjustment(
                        updated,
                        grant,
                        TransactionDirection.CREDIT,
                        grant,
                        admin,
                        "Genesis Community Sustainability Grant"
                );
                ecoTokenTransactionRepository.save(genesisTx);
            }

            logger.info("Seeded default Household user: {} / household123 with 150.00 ECO tokens", email);
            return updated;
        });
    }

    private Farmer seedFarmerUser() {
        String email = "farmer@agroloop.com";
        return farmerRepository.findByEmail(email).orElseGet(() -> {
            Farmer farmer = new Farmer(
                    "Bob Farmer",
                    email,
                    passwordEncoder.encode("farmer123"),
                    "Green Valley Organic Farm",
                    "Wayanad Agro Zone, Kerala",
                    "Certified organic farm specializing in vegetables, bio-fertilizers, and high-yield composting."
            );
            farmer.updateLocationAndCapacity(10.8505, 76.2711, 25.0, new BigDecimal("500.00"));
            farmer.updateReputation(5.0, 2);
            Farmer saved = farmerRepository.save(farmer);
            logger.info("Seeded default Farmer user: {} / farmer123", email);
            return saved;
        });
    }

    private List<Product> seedProducts(Farmer farmer) {
        if (productRepository.count() > 0) {
            return productRepository.findAll();
        }

        List<Product> products = List.of(
                new Product(
                        farmer,
                        "Enriched Organic Compost (5kg)",
                        "Microbe-rich organic compost produced from circular household waste. Ideal for home gardens and potted plants.",
                        ProductCategory.COMPOST_AND_SOIL,
                        "5kg Bag",
                        new BigDecimal("35.00"),
                        45,
                        "/images/products/compost.jpg"
                ),
                new Product(
                        farmer,
                        "Premium Vermicompost (10kg)",
                        "Worm-castings enriched natural soil conditioner packed with nitrogen, phosphorus, and potassium.",
                        ProductCategory.COMPOST_AND_SOIL,
                        "10kg Bag",
                        new BigDecimal("60.00"),
                        30,
                        "/images/products/vermicompost.jpg"
                ),
                new Product(
                        farmer,
                        "Cold-Pressed Neem Oil Spray (500ml)",
                        "Natural bio-pesticide protecting against aphids, mites, and fungal infections without chemical residues.",
                        ProductCategory.COMPOST_AND_SOIL,
                        "500ml Bottle",
                        new BigDecimal("25.00"),
                        50,
                        "/images/products/neem-spray.jpg"
                ),
                new Product(
                        farmer,
                        "Heirloom Tomato Basket (2kg)",
                        "Sun-ripened organic tomatoes grown purely on verified AgroLoop compost. Rich in natural flavor.",
                        ProductCategory.ORGANIC_VEGETABLES,
                        "2kg Basket",
                        new BigDecimal("20.00"),
                        25,
                        "/images/products/tomatoes.jpg"
                ),
                new Product(
                        farmer,
                        "Fresh Farm Spinach & Greens Bundle",
                        "Crisp pesticide-free organic greens harvested daily from the Wayanad agro-valley.",
                        ProductCategory.ORGANIC_VEGETABLES,
                        "500g Bundle",
                        new BigDecimal("15.00"),
                        40,
                        "/images/products/spinach.jpg"
                ),
                new Product(
                        farmer,
                        "Organic Alphonso Mango Crate (3kg)",
                        "Naturally tree-ripened sweet Alphonso mangoes cultivated with organic regenerative fertilizers.",
                        ProductCategory.FRESH_FRUITS,
                        "3kg Crate",
                        new BigDecimal("75.00"),
                        15,
                        "/images/products/mangoes.jpg"
                ),
                new Product(
                        farmer,
                        "A2 Fresh Farm Milk (1L)",
                        "Ethically produced pure A2 raw milk from indigenous grass-fed cattle.",
                        ProductCategory.FARM_DAIRY,
                        "1L Glass Bottle",
                        new BigDecimal("18.00"),
                        35,
                        "/images/products/milk.jpg"
                ),
                new Product(
                        farmer,
                        "Heirloom Vegetable Starter Seeds (Pack of 5)",
                        "Non-GMO native vegetable seeds including chili, okra, brinjal, cucumber, and spinach.",
                        ProductCategory.SEEDS_AND_SAPLINGS,
                        "5-Pack",
                        new BigDecimal("22.00"),
                        60,
                        "/images/products/seeds.jpg"
                )
        );

        List<Product> saved = productRepository.saveAll(products);
        logger.info("Seeded {} marketplace products under Farmer {}", saved.size(), farmer.getEmail());
        return saved;
    }

    private PickupRequest seedWasteSubmissionsAndPickups(Household household, Farmer farmer) {
        if (wasteSubmissionRepository.count() > 0) {
            return pickupRequestRepository.findAll().stream().findFirst().orElse(null);
        }

        // 1. Verified & Rewarded Submission
        WasteSubmission sub1 = new WasteSubmission(
                household,
                WasteCategory.FOOD_SCRAPS,
                new BigDecimal("5.40"),
                "Green View Residency, Kochi, Kerala",
                "/images/waste/sub1.jpg",
                "Clean fruit and vegetable kitchen peelings.",
                10.8505,
                76.2711
        );
        WasteSubmission savedSub1 = wasteSubmissionRepository.save(sub1);

        PickupRequest pickup1 = new PickupRequest(savedSub1);
        pickup1.accept(farmer);
        pickup1.schedule(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        pickup1.markCollected();
        PickupRequest savedPickup1 = pickupRequestRepository.save(pickup1);

        WasteVerification verification = new WasteVerification(
                savedPickup1,
                farmer,
                new BigDecimal("5.20"),
                QualityGrade.GRADE_A,
                "Clean segregated organic kitchen waste, zero plastics. Optimal for vermicomposting."
        );
        WasteVerification savedVerification = wasteVerificationRepository.save(verification);
        savedPickup1.recordVerification(savedVerification);
        pickupRequestRepository.save(savedPickup1);

        // Mint token reward (+52 ECO) for Alice
        BigDecimal rewardAmount = new BigDecimal("52.00");
        household.addTokens(rewardAmount);
        householdRepository.save(household);

        EcoTokenTransaction rewardTx = EcoTokenTransaction.rewardMinted(
                household,
                savedVerification,
                rewardAmount,
                household.getTokenBalance(),
                farmer
        );
        ecoTokenTransactionRepository.save(rewardTx);

        // 2. Scheduled In-Progress Submission
        WasteSubmission sub2 = new WasteSubmission(
                household,
                WasteCategory.COFFEE_GROUNDS,
                new BigDecimal("3.80"),
                "Green View Residency, Kochi, Kerala",
                "/images/waste/sub2.jpg",
                "Spent coffee grounds and green tea leaves.",
                10.8520,
                76.2725
        );
        WasteSubmission savedSub2 = wasteSubmissionRepository.save(sub2);

        PickupRequest pickup2 = new PickupRequest(savedSub2);
        pickup2.accept(farmer);
        pickup2.schedule(LocalDateTime.now().plusDays(2).withHour(9).withMinute(30));
        pickupRequestRepository.save(pickup2);

        // 3. Pending Submission (Awaiting Farmer Pickup)
        WasteSubmission sub3 = new WasteSubmission(
                household,
                WasteCategory.GARDEN_WASTE,
                new BigDecimal("12.50"),
                "Green View Residency, Kochi, Kerala",
                "/images/waste/sub3.jpg",
                "Dried leaves, grass trimmings, and hedge prunings.",
                10.8510,
                76.2700
        );
        WasteSubmission savedSub3 = wasteSubmissionRepository.save(sub3);
        PickupRequest pickup3 = new PickupRequest(savedSub3);
        pickupRequestRepository.save(pickup3);

        logger.info("Seeded 3 waste submissions and pickups (VERIFIED, SCHEDULED, REQUESTED) for {}", household.getEmail());
        return savedPickup1;
    }

    private Order seedMarketplaceOrders(Household household, List<Product> products, Farmer farmer) {
        if (orderRepository.count() > 0 || products.isEmpty()) {
            return orderRepository.findAll().stream().findFirst().orElse(null);
        }

        Product compost = products.get(0); // Enriched Organic Compost (35.00 ECO)
        Order order1 = new Order(
                household,
                "Green View Residency, Kochi, Kerala",
                "Please deliver to the front porch garden."
        );
        order1.addItem(compost, 1);
        order1.complete();
        Order savedOrder1 = orderRepository.save(order1);

        // Record marketplace purchase debit in ledger (-35.00 ECO)
        household.spendTokens(savedOrder1.getTotalTokens());
        householdRepository.save(household);

        EcoTokenTransaction purchaseTx = EcoTokenTransaction.marketplacePurchase(
                household,
                savedOrder1,
                savedOrder1.getTotalTokens(),
                household.getTokenBalance(),
                household
        );
        ecoTokenTransactionRepository.save(purchaseTx);

        // Order 2: Placed status
        if (products.size() > 3) {
            Product tomatoes = products.get(3); // Heirloom Tomatoes (20.00 ECO)
            Order order2 = new Order(
                    household,
                    "Green View Residency, Kochi, Kerala",
                    "Leave at the security reception if away."
            );
            order2.addItem(tomatoes, 1);
            orderRepository.save(order2);
        }

        logger.info("Seeded marketplace orders for {}", household.getEmail());
        return savedOrder1;
    }

    private void seedReviews(Household household, Farmer farmer, PickupRequest pickup, Order order) {
        if (reviewRepository.count() > 0) {
            return;
        }

        if (pickup != null) {
            Review review1 = new Review(
                    household,
                    farmer,
                    ReviewType.PICKUP_EXPERIENCE,
                    5,
                    "Prompt, courteous waste pickup! Highly recommend Farmer Bob for organic collections.",
                    pickup,
                    null
            );
            reviewRepository.save(review1);
        }

        if (order != null) {
            Review review2 = new Review(
                    household,
                    farmer,
                    ReviewType.COMPOST_QUALITY,
                    5,
                    "Exceptional compost quality. My tomatoes have grown twice as fast!",
                    null,
                    order
            );
            reviewRepository.save(review2);
        }

        logger.info("Seeded trust reviews between {} and {}", household.getEmail(), farmer.getEmail());
    }

    private void seedRoutes(Farmer farmer, PickupRequest pickup) {
        if (collectionRouteRepository.count() > 0) {
            return;
        }

        CollectionRoute route = new CollectionRoute(
                farmer,
                LocalDate.now(),
                "Morning Kochi-Wayanad Organic Collection Corridor"
        );
        if (pickup != null) {
            route.addStop(pickup, 1, 4.2);
            route.startRoute();
        }
        collectionRouteRepository.save(route);
        logger.info("Seeded collection route for Farmer {}", farmer.getEmail());
    }

    private void seedNotifications(Household household, Farmer farmer) {
        if (notificationRepository.count() > 0) {
            return;
        }

        List<Notification> notifications = List.of(
                new Notification(
                        household,
                        "EcoTokens Rewarded",
                        "You received +52.00 ECO for verified Grade-A organic waste submission.",
                        NotificationType.TOKENS_MINTED,
                        "/household/ledger"
                ),
                new Notification(
                        household,
                        "Order Delivered",
                        "Your order for Enriched Organic Compost (5kg) has been completed.",
                        NotificationType.ORDER_STATUS_CHANGED,
                        "/orders"
                ),
                new Notification(
                        household,
                        "Pickup Scheduled",
                        "Farmer Bob confirmed collection for tomorrow at 09:30 AM.",
                        NotificationType.PICKUP_SCHEDULED,
                        "/household/pickups"
                ),
                new Notification(
                        farmer,
                        "Nearby Waste Available",
                        "A new 12.5kg Garden Waste submission is available in your service radius.",
                        NotificationType.NEW_NEARBY_WASTE,
                        "/farmer/pickups"
                ),
                new Notification(
                        farmer,
                        "New Order Received",
                        "Household Alice Green purchased Enriched Organic Compost (5kg).",
                        NotificationType.ORDER_PLACED,
                        "/farmer/orders"
                )
        );

        notificationRepository.saveAll(notifications);
        logger.info("Seeded platform notifications for Household and Farmer");
    }
}
