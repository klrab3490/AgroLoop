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
import com.agroloop.model.PickupRequest;
import com.agroloop.model.Product;
import com.agroloop.model.ProductCategory;
import com.agroloop.model.QualityGrade;
import com.agroloop.model.Review;
import com.agroloop.model.ReviewType;
import com.agroloop.model.RouteStop;
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
import java.util.ArrayList;
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
        Household household1 = seedHouseholdUser(admin);
        Household household2 = seedAdditionalHousehold(
                "David Miller",
                "david.household@agroloop.com",
                "Palm Grove Heights, Villa 12, Thrissur, Kerala",
                new BigDecimal("320.00"),
                admin
        );
        Household household3 = seedAdditionalHousehold(
                "Sarah Connor",
                "sarah.household@agroloop.com",
                "Riverside Eco Villa, Block C, Aluva, Kerala",
                new BigDecimal("185.00"),
                admin
        );

        Farmer farmer1 = seedFarmerUser();
        Farmer farmer2 = seedAdditionalFarmer(
                "Priya Nair",
                "priya.farmer@agroloop.com",
                "Highland Eco Farm",
                "Munnar Hills, Idukki District, Kerala",
                "High-altitude organic orchard specializing in vermicompost, herbs, and biochar conditioning.",
                10.0889,
                77.0595,
                30.0,
                new BigDecimal("400.00")
        );
        Farmer farmer3 = seedAdditionalFarmer(
                "Carlos Rivera",
                "carlos.farmer@agroloop.com",
                "Sunburst Bio Orchards",
                "Palakkad Agricultural Belt, Kerala",
                "Regenerative farming cooperative producing tropical fruits, organic turmeric, and nursery saplings.",
                10.7867,
                76.6548,
                40.0,
                new BigDecimal("600.00")
        );

        if (seedFullData) {
            List<Product> products = seedProducts(farmer1, farmer2, farmer3);
            PickupRequest verifiedPickup = seedWasteSubmissionsAndPickups(household1, household2, household3, farmer1, farmer2, farmer3);
            Order completedOrder = seedMarketplaceOrders(household1, household2, household3, products, farmer1, farmer2);
            seedReviews(household1, household2, farmer1, farmer2, verifiedPickup, completedOrder);
            seedRoutes(farmer1, farmer2, farmer3, verifiedPickup);
            seedNotifications(household1, household2, farmer1);
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
                    "Green View Residency, Flat 4B, MG Road, Kochi, Kerala"
            );
            household.updateReputation(5.0, 1);
            Household saved = householdRepository.save(household);

            BigDecimal grant = new BigDecimal("250.00");
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

            logger.info("Seeded default Household user: {} / household123 with 250.00 ECO tokens", email);
            return updated;
        });
    }

    private Household seedAdditionalHousehold(String name, String email, String address, BigDecimal initialGrant, Admin admin) {
        return householdRepository.findByEmail(email).orElseGet(() -> {
            Household household = new Household(
                    name,
                    email,
                    passwordEncoder.encode("household123"),
                    address
            );
            household.updateReputation(5.0, 1);
            Household saved = householdRepository.save(household);

            saved.addTokens(initialGrant);
            Household updated = householdRepository.save(saved);

            if (seedFullData) {
                EcoTokenTransaction grantTx = EcoTokenTransaction.adminAdjustment(
                        updated,
                        initialGrant,
                        TransactionDirection.CREDIT,
                        initialGrant,
                        admin,
                        "Regional Household Onboarding Grant"
                );
                ecoTokenTransactionRepository.save(grantTx);
            }

            logger.info("Seeded Household user: {} / household123 with {} ECO tokens", email, initialGrant);
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
            farmer.updateLocationAndCapacity(10.8505, 76.2711, 35.0, new BigDecimal("500.00"));
            farmer.updateReputation(5.0, 2);
            Farmer saved = farmerRepository.save(farmer);
            logger.info("Seeded default Farmer user: {} / farmer123", email);
            return saved;
        });
    }

    private Farmer seedAdditionalFarmer(
            String name,
            String email,
            String farmName,
            String address,
            String notes,
            double lat,
            double lon,
            double radiusKm,
            BigDecimal dailyCapKg
    ) {
        return farmerRepository.findByEmail(email).orElseGet(() -> {
            Farmer farmer = new Farmer(
                    name,
                    email,
                    passwordEncoder.encode("farmer123"),
                    farmName,
                    address,
                    notes
            );
            farmer.updateLocationAndCapacity(lat, lon, radiusKm, dailyCapKg);
            farmer.updateReputation(5.0, 3);
            Farmer saved = farmerRepository.save(farmer);
            logger.info("Seeded Farmer user: {} / farmer123", email);
            return saved;
        });
    }

    private List<Product> seedProducts(Farmer f1, Farmer f2, Farmer f3) {
        if (productRepository.count() >= 20) {
            return productRepository.findAll();
        }

        List<Product> productsToSave = new ArrayList<>();

        // Helper to check existing by name
        java.util.Set<String> existingNames = new java.util.HashSet<>();
        productRepository.findAll().forEach(p -> existingNames.add(p.getName()));

        // --- COMPOST & SOIL ---
        addIfMissing(productsToSave, existingNames, new Product(f1, "Enriched Organic Compost (5kg)", "Microbe-rich organic compost produced from circular household waste. Ideal for home gardens and potted plants.", ProductCategory.COMPOST_AND_SOIL, "5kg Bag", new BigDecimal("35.00"), 45, "/images/products/compost.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f1, "Premium Vermicompost (10kg)", "Worm-castings enriched natural soil conditioner packed with nitrogen, phosphorus, and potassium.", ProductCategory.COMPOST_AND_SOIL, "10kg Bag", new BigDecimal("60.00"), 30, "/images/products/vermicompost.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f1, "Cold-Pressed Neem Oil Spray (500ml)", "Natural bio-pesticide protecting against aphids, mites, and fungal infections without chemical residues.", ProductCategory.COMPOST_AND_SOIL, "500ml Bottle", new BigDecimal("25.00"), 50, "/images/products/neem-spray.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Biochar Soil Conditioner & Inoculant (3kg)", "High-porosity activated horticultural biochar charged with beneficial mycorrhizae for maximum moisture retention.", ProductCategory.COMPOST_AND_SOIL, "3kg Bag", new BigDecimal("42.00"), 24, "/images/products/biochar.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f3, "Aged Mushroom Compost Mulch (15kg)", "Naturally decomposed wheat straw and organic peat substrate providing dense weed suppression and long-term soil carbon.", ProductCategory.COMPOST_AND_SOIL, "15kg Bag", new BigDecimal("55.00"), 18, "/images/products/mushroom-mulch.jpg"));

        // --- ORGANIC VEGETABLES ---
        addIfMissing(productsToSave, existingNames, new Product(f1, "Heirloom Tomato Basket (2kg)", "Sun-ripened organic tomatoes grown purely on verified AgroLoop compost. Rich in natural acidity and sweet flavor.", ProductCategory.ORGANIC_VEGETABLES, "2kg Basket", new BigDecimal("20.00"), 25, "/images/products/tomatoes.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f1, "Fresh Farm Spinach & Greens Bundle", "Crisp pesticide-free organic greens harvested daily from the fertile Wayanad agro-valley.", ProductCategory.ORGANIC_VEGETABLES, "500g Bundle", new BigDecimal("15.00"), 40, "/images/products/spinach.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Crisp Tri-Color Bell Peppers (1kg)", "Greenhouse-grown sweet bell peppers nurtured with vermicompost tea for thick walls and vibrant coloration.", ProductCategory.ORGANIC_VEGETABLES, "1kg Box", new BigDecimal("24.00"), 32, "/images/products/bell-peppers.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Tender Organic Baby Carrots (1kg)", "Naturally sweet crunchy baby carrots pulled fresh from loose sandy loam conditioned with circular organics.", ProductCategory.ORGANIC_VEGETABLES, "1kg Bunch", new BigDecimal("18.00"), 28, "/images/products/carrots.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f3, "Farm Fresh Cucumbers & Ridge Gourd (2kg)", "Hydrating, non-waxed crisp cucumbers and tender ridge gourd cultivated with organic drip fertigation.", ProductCategory.ORGANIC_VEGETABLES, "2kg Basket", new BigDecimal("22.00"), 35, "/images/products/cucumbers.jpg"));

        // --- FRESH FRUITS ---
        addIfMissing(productsToSave, existingNames, new Product(f1, "Organic Alphonso Mango Crate (3kg)", "Naturally tree-ripened sweet Alphonso mangoes cultivated with organic regenerative fertilizers and zero carbide.", ProductCategory.FRESH_FRUITS, "3kg Crate", new BigDecimal("75.00"), 15, "/images/products/mangoes.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f3, "Sun-Ripened Sweet Red Papaya Box (2kg)", "Honey-sweet, vitamin-packed Red Lady papayas grown under full tropical sunlight with biochar soil amendments.", ProductCategory.FRESH_FRUITS, "2kg Box", new BigDecimal("28.00"), 20, "/images/products/papaya.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Organic Red Banana Cluster (1.5kg)", "Rare indigenous red dacca bananas celebrated for rich creamy texture, high potassium, and delicate berry aroma.", ProductCategory.FRESH_FRUITS, "1.5kg Cluster", new BigDecimal("18.00"), 30, "/images/products/red-bananas.jpg"));

        // --- FARM DAIRY ---
        addIfMissing(productsToSave, existingNames, new Product(f1, "A2 Fresh Farm Milk (1L)", "Ethically produced pure A2 raw milk from indigenous grass-fed cattle. Glass-bottled and chilled.", ProductCategory.FARM_DAIRY, "1L Glass Bottle", new BigDecimal("18.00"), 35, "/images/products/milk.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f1, "Artisanal A2 Desi Cow Ghee (500ml)", "Slow-simmered golden ghee prepared using traditional Bilona churning of cultured A2 curd.", ProductCategory.FARM_DAIRY, "500ml Jar", new BigDecimal("85.00"), 12, "/images/products/ghee.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Farmhouse Probiotic Curd & Yogurt (1kg)", "Thick, naturally set traditional curd rich in living active cultures and made from highland whole milk.", ProductCategory.FARM_DAIRY, "1kg Tub", new BigDecimal("26.00"), 22, "/images/products/curd.jpg"));

        // --- SEEDS & SAPLINGS ---
        addIfMissing(productsToSave, existingNames, new Product(f1, "Heirloom Vegetable Starter Seeds (Pack of 5)", "Non-GMO native vegetable seeds including chili, okra, brinjal, cucumber, and spinach for container gardening.", ProductCategory.SEEDS_AND_SAPLINGS, "5-Pack", new BigDecimal("22.00"), 60, "/images/products/seeds.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f2, "Indigenous Ayurvedic Herb Seed Kit (Pack of 4)", "High-germination seed collection of Tulsi, Ashwagandha, Brahmi, and Lemongrass with planting calendar.", ProductCategory.SEEDS_AND_SAPLINGS, "4-Pack", new BigDecimal("30.00"), 45, "/images/products/herb-seeds.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f3, "Fast-Growing Moringa Oleifera Saplings (2-Pack)", "Hardy, drought-tolerant drumstick tree saplings in biodegradable coir nursery pots ready for soil transplant.", ProductCategory.SEEDS_AND_SAPLINGS, "2-Pack Pots", new BigDecimal("35.00"), 20, "/images/products/moringa-saplings.jpg"));

        // --- HERBS & SPICES ---
        addIfMissing(productsToSave, existingNames, new Product(f2, "Fresh Culinary Sweet Basil & Mint Duo (250g)", "Aromatic Italian sweet basil and pungent garden spearmint snipped morning of dispatch for supreme freshness.", ProductCategory.HERBS_AND_SPICES, "250g Pack", new BigDecimal("14.00"), 40, "/images/products/basil-mint.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f3, "High-Curcumin Organic Lakadong Turmeric (250g)", "Finely ground pure Lakadong turmeric powder with over 7.5% natural curcumin content. Solar-dried and unadulterated.", ProductCategory.HERBS_AND_SPICES, "250g Glass Jar", new BigDecimal("38.00"), 50, "/images/products/turmeric.jpg"));
        addIfMissing(productsToSave, existingNames, new Product(f1, "Sun-Dried Tellicherry Black Peppercorns (200g)", "Extra-bold premium whole black peppercorns harvested from Wayanad vines. Intense floral heat and citrus finish.", ProductCategory.HERBS_AND_SPICES, "200g Pouch", new BigDecimal("32.00"), 35, "/images/products/black-pepper.jpg"));

        if (!productsToSave.isEmpty()) {
            productRepository.saveAll(productsToSave);
            logger.info("Seeded {} additional marketplace products across categories", productsToSave.size());
        }

        return productRepository.findAll();
    }

    private void addIfMissing(List<Product> target, java.util.Set<String> existingNames, Product p) {
        if (!existingNames.contains(p.getName())) {
            target.add(p);
            existingNames.add(p.getName());
        }
    }

    private PickupRequest seedWasteSubmissionsAndPickups(
            Household h1, Household h2, Household h3,
            Farmer f1, Farmer f2, Farmer f3
    ) {
        if (pickupRequestRepository.count() >= 10) {
            return pickupRequestRepository.findAll().stream().findFirst().orElse(null);
        }

        // --- 1. VERIFIED PICKUPS (Inspection Complete, Tokens Minted) ---
        WasteSubmission subVerif1 = wasteSubmissionRepository.save(new WasteSubmission(
                h1, WasteCategory.FOOD_SCRAPS, new BigDecimal("5.40"),
                "Green View Residency, Flat 4B, MG Road, Kochi, Kerala", "/images/waste/sub101.jpg",
                "Clean fruit and vegetable kitchen peelings.", 10.8505, 76.2711
        ));
        PickupRequest pVerif1 = new PickupRequest(subVerif1);
        pVerif1.accept(f1);
        pVerif1.schedule(LocalDateTime.now().minusDays(1).withHour(10).withMinute(0));
        pVerif1.markCollected();
        PickupRequest savedPVerif1 = pickupRequestRepository.save(pVerif1);

        WasteVerification verif1 = wasteVerificationRepository.save(new WasteVerification(
                savedPVerif1, f1, new BigDecimal("5.20"), QualityGrade.GRADE_A,
                "Clean segregated organic kitchen waste, zero plastics. Optimal for vermicomposting."
        ));
        savedPVerif1.recordVerification(verif1);
        pickupRequestRepository.save(savedPVerif1);
        mintRewardTokens(h1, verif1, new BigDecimal("52.00"), f1);

        // Verified 2: David Miller + Priya Nair (18.40kg Grade A)
        WasteSubmission subVerif2 = wasteSubmissionRepository.save(new WasteSubmission(
                h2, WasteCategory.GARDEN_WASTE, new BigDecimal("19.00"),
                "Palm Grove Heights, Villa 12, Thrissur, Kerala", "/images/waste/sub102.jpg",
                "Dry foliage and hedge clippings with zero debris.", 10.5276, 76.2144
        ));
        PickupRequest pVerif2 = new PickupRequest(subVerif2);
        pVerif2.accept(f2);
        pVerif2.schedule(LocalDateTime.now().minusDays(1).withHour(11).withMinute(30));
        pVerif2.markCollected();
        PickupRequest savedPVerif2 = pickupRequestRepository.save(pVerif2);

        WasteVerification verif2 = wasteVerificationRepository.save(new WasteVerification(
                savedPVerif2, f2, new BigDecimal("18.40"), QualityGrade.GRADE_A,
                "Dry lawn clippings, tree prunings, and mulch matter. Excellent carbon ratio."
        ));
        savedPVerif2.recordVerification(verif2);
        pickupRequestRepository.save(savedPVerif2);
        mintRewardTokens(h2, verif2, new BigDecimal("184.00"), f2);

        // Verified 3: Sarah Connor + Carlos Rivera (9.80kg Grade B)
        WasteSubmission subVerif3 = wasteSubmissionRepository.save(new WasteSubmission(
                h3, WasteCategory.FOOD_SCRAPS, new BigDecimal("10.50"),
                "Riverside Eco Villa, Block C, Aluva, Kerala", "/images/waste/sub103.jpg",
                "Sorted community organic kitchen waste.", 10.1076, 76.3516
        ));
        PickupRequest pVerif3 = new PickupRequest(subVerif3);
        pVerif3.accept(f3);
        pVerif3.schedule(LocalDateTime.now().minusDays(1).withHour(14).withMinute(0));
        pVerif3.markCollected();
        PickupRequest savedPVerif3 = pickupRequestRepository.save(pVerif3);

        WasteVerification verif3 = wasteVerificationRepository.save(new WasteVerification(
                savedPVerif3, f3, new BigDecimal("9.80"), QualityGrade.GRADE_B,
                "Good organic matter with minor moisture variation. Approved for standard windrows."
        ));
        savedPVerif3.recordVerification(verif3);
        pickupRequestRepository.save(savedPVerif3);
        mintRewardTokens(h3, verif3, new BigDecimal("88.00"), f3);

        // --- 2. COLLECTED PICKUPS (Retrieved, Truck In-Transit) ---
        WasteSubmission subCol1 = wasteSubmissionRepository.save(new WasteSubmission(
                h3, WasteCategory.GARDEN_WASTE, new BigDecimal("15.40"),
                "Riverside Eco Villa, Block C, Aluva, Kerala", "/images/waste/sub108.jpg",
                "Bamboo trimmings and mulch leaves.", 10.1095, 76.3535
        ));
        PickupRequest pCol1 = new PickupRequest(subCol1);
        pCol1.accept(f2);
        pCol1.schedule(LocalDateTime.now().minusHours(3));
        pCol1.markCollected();
        pickupRequestRepository.save(pCol1);

        WasteSubmission subCol2 = wasteSubmissionRepository.save(new WasteSubmission(
                h2, WasteCategory.FOOD_SCRAPS, new BigDecimal("7.20"),
                "Palm Grove Heights, Villa 12, Thrissur, Kerala", "/images/waste/sub109.jpg",
                "Sorted daily kitchen biodegradables.", 10.5295, 76.2160
        ));
        PickupRequest pCol2 = new PickupRequest(subCol2);
        pCol2.accept(f1);
        pCol2.schedule(LocalDateTime.now().minusHours(4));
        pCol2.markCollected();
        pickupRequestRepository.save(pCol2);

        // --- 3. SCHEDULED PICKUPS (Appointment Confirmed) ---
        WasteSubmission subSched1 = wasteSubmissionRepository.save(new WasteSubmission(
                h1, WasteCategory.COFFEE_GROUNDS, new BigDecimal("4.80"),
                "Green View Residency, Flat 4B, MG Road, Kochi, Kerala", "/images/waste/sub107.jpg",
                "Spent coffee grounds and green tea bags.", 10.8525, 76.2730
        ));
        PickupRequest pSched1 = new PickupRequest(subSched1);
        pSched1.accept(f1);
        pSched1.schedule(LocalDateTime.now().plusHours(4));
        pickupRequestRepository.save(pSched1);

        WasteSubmission subSched2 = wasteSubmissionRepository.save(new WasteSubmission(
                h2, WasteCategory.FOOD_SCRAPS, new BigDecimal("9.60"),
                "Palm Grove Heights, Villa 12, Thrissur, Kerala", "/images/waste/sub106.jpg",
                "Vegetable cuttings in compostable bags.", 10.5285, 76.2150
        ));
        PickupRequest pSched2 = new PickupRequest(subSched2);
        pSched2.accept(f3);
        pSched2.schedule(LocalDateTime.now().plusHours(14));
        pickupRequestRepository.save(pSched2);

        // --- 4. ASSIGNED PICKUPS (Claimed by Farmers, Scheduling in Progress) ---
        WasteSubmission subAss1 = wasteSubmissionRepository.save(new WasteSubmission(
                h1, WasteCategory.FOOD_SCRAPS, new BigDecimal("11.00"),
                "Green View Residency, Flat 4B, MG Road, Kochi, Kerala", "/images/waste/sub104.jpg",
                "Bakery dough residue and spent grains.", 10.8515, 76.2720
        ));
        PickupRequest pAss1 = new PickupRequest(subAss1);
        pAss1.accept(f1);
        pickupRequestRepository.save(pAss1);

        WasteSubmission subAss2 = wasteSubmissionRepository.save(new WasteSubmission(
                h3, WasteCategory.FOOD_SCRAPS, new BigDecimal("8.40"),
                "Riverside Eco Villa, Block C, Aluva, Kerala", "/images/waste/sub105.jpg",
                "Kitchen preparation scraps and crushed eggshells.", 10.1085, 76.3525
        ));
        PickupRequest pAss2 = new PickupRequest(subAss2);
        pAss2.accept(f2);
        pickupRequestRepository.save(pAss2);

        // --- 5. REQUESTED PICKUPS (Queued in Regional Dispatch Backlog) ---
        WasteSubmission subReq1 = wasteSubmissionRepository.save(new WasteSubmission(
                h1, WasteCategory.FOOD_SCRAPS, new BigDecimal("6.50"),
                "Green View Residency, Flat 4B, MG Road, Kochi, Kerala", "/images/waste/sub101.jpg",
                "Kitchen fruit peelings and shredded vegetable tops.", 10.8505, 76.2711
        ));
        pickupRequestRepository.save(new PickupRequest(subReq1));

        WasteSubmission subReq2 = wasteSubmissionRepository.save(new WasteSubmission(
                h2, WasteCategory.GARDEN_WASTE, new BigDecimal("14.80"),
                "Palm Grove Heights, Villa 12, Thrissur, Kerala", "/images/waste/sub102.jpg",
                "Lawn clippings and pruned hibiscus branches bagged curbside.", 10.5276, 76.2144
        ));
        pickupRequestRepository.save(new PickupRequest(subReq2));

        WasteSubmission subReq3 = wasteSubmissionRepository.save(new WasteSubmission(
                h3, WasteCategory.COFFEE_GROUNDS, new BigDecimal("5.20"),
                "Riverside Eco Villa, Block C, Aluva, Kerala", "/images/waste/sub103.jpg",
                "Spent espresso grounds and chamomile tea bags.", 10.1076, 76.3516
        ));
        pickupRequestRepository.save(new PickupRequest(subReq3));

        // --- 6. CANCELLED PICKUP ---
        WasteSubmission subCanc = wasteSubmissionRepository.save(new WasteSubmission(
                h2, WasteCategory.FOOD_SCRAPS, new BigDecimal("3.00"),
                "Palm Grove Heights, Villa 12, Thrissur, Kerala", "/images/waste/sub113.jpg",
                "Cancelled batch prior to collection.", 10.5276, 76.2144
        ));
        PickupRequest pCanc = new PickupRequest(subCanc);
        pCanc.cancel("Resident travelling out of district for two weeks.");
        pickupRequestRepository.save(pCanc);

        logger.info("Seeded 13 comprehensive fleet pickups spanning all lifecycle stages");
        return savedPVerif1;
    }

    private void mintRewardTokens(Household household, WasteVerification verification, BigDecimal rewardAmount, Farmer farmer) {
        household.addTokens(rewardAmount);
        householdRepository.save(household);

        EcoTokenTransaction rewardTx = EcoTokenTransaction.rewardMinted(
                household,
                verification,
                rewardAmount,
                household.getTokenBalance(),
                farmer
        );
        ecoTokenTransactionRepository.save(rewardTx);
    }

    private Order seedMarketplaceOrders(
            Household h1, Household h2, Household h3,
            List<Product> products, Farmer f1, Farmer f2
    ) {
        if (orderRepository.count() >= 3 || products.isEmpty()) {
            return orderRepository.findAll().stream().findFirst().orElse(null);
        }

        Product compost = products.get(0);
        Order order1 = new Order(h1, "Green View Residency, Flat 4B, MG Road, Kochi, Kerala", "Please deliver to the front porch garden.");
        order1.addItem(compost, 1);
        order1.complete();
        Order savedOrder1 = orderRepository.save(order1);

        h1.spendTokens(savedOrder1.getTotalTokens());
        householdRepository.save(h1);

        EcoTokenTransaction purchaseTx = EcoTokenTransaction.marketplacePurchase(
                h1, savedOrder1, savedOrder1.getTotalTokens(), h1.getTokenBalance(), h1
        );
        ecoTokenTransactionRepository.save(purchaseTx);

        // Order 2: Placed status for David Miller
        if (products.size() > 5) {
            Product tomatoes = products.get(5);
            Order order2 = new Order(h2, "Palm Grove Heights, Villa 12, Thrissur, Kerala", "Leave at the security reception if away.");
            order2.addItem(tomatoes, 1);
            orderRepository.save(order2);
        }

        // Order 3: Placed status for Sarah Connor
        if (products.size() > 3) {
            Product biochar = products.get(3);
            Order order3 = new Order(h3, "Riverside Eco Villa, Block C, Aluva, Kerala", "Please call before dispatch.");
            order3.addItem(biochar, 1);
            orderRepository.save(order3);
        }

        logger.info("Seeded marketplace orders across households");
        return savedOrder1;
    }

    private void seedReviews(Household h1, Household h2, Farmer f1, Farmer f2, PickupRequest pickup, Order order) {
        if (reviewRepository.count() >= 2) {
            return;
        }

        if (pickup != null) {
            Review review1 = new Review(
                    h1, f1, ReviewType.PICKUP_EXPERIENCE, 5,
                    "Prompt, courteous waste pickup! Highly recommend Farmer Bob for organic collections.",
                    pickup, null
            );
            reviewRepository.save(review1);
        }

        if (order != null) {
            Review review2 = new Review(
                    h1, f1, ReviewType.COMPOST_QUALITY, 5,
                    "Exceptional compost quality. My tomatoes have grown twice as fast!",
                    null, order
            );
            reviewRepository.save(review2);
        }

        logger.info("Seeded trust reviews between platform participants");
    }

    private void seedRoutes(Farmer f1, Farmer f2, Farmer f3, PickupRequest pickup) {
        if (collectionRouteRepository.count() >= 3) {
            return;
        }

        // Route 1: Farmer Bob (In Progress)
        CollectionRoute route1 = new CollectionRoute(f1, LocalDate.now(), "Route #201: Morning Kochi-Wayanad Organic Corridor");
        if (pickup != null) {
            route1.addStop(pickup, 1, 4.2);
            route1.startRoute();
        }
        collectionRouteRepository.save(route1);

        // Route 2: Farmer Priya (Planned)
        CollectionRoute route2 = new CollectionRoute(f2, LocalDate.now().plusDays(1), "Route #202: Munnar Valley High-Altitude Bio-Waste Express");
        collectionRouteRepository.save(route2);

        // Route 3: Farmer Carlos (Completed)
        CollectionRoute route3 = new CollectionRoute(f3, LocalDate.now().minusDays(1), "Route #203: Palakkad Agricultural Belt Collection Run");
        route3.startRoute();
        route3.completeRoute();
        collectionRouteRepository.save(route3);

        logger.info("Seeded 3 collection routes across farmers");
    }

    private void seedNotifications(Household h1, Household h2, Farmer f1) {
        if (notificationRepository.count() >= 5) {
            return;
        }

        List<Notification> notifications = List.of(
                new Notification(h1, "EcoTokens Rewarded", "You received +52.00 ECO for verified Grade-A organic waste submission.", NotificationType.TOKENS_MINTED, "/household/ledger"),
                new Notification(h1, "Order Delivered", "Your order for Enriched Organic Compost (5kg) has been completed.", NotificationType.ORDER_STATUS_CHANGED, "/orders"),
                new Notification(h2, "Pickup Scheduled", "Farmer Carlos Rivera confirmed collection for tomorrow at 10:30 AM.", NotificationType.PICKUP_SCHEDULED, "/household/pickups"),
                new Notification(f1, "Nearby Waste Available", "A new 14.8kg Garden Waste submission is available in your service radius.", NotificationType.NEW_NEARBY_WASTE, "/farmer/pickups"),
                new Notification(f1, "New Order Received", "Household Alice Green purchased Enriched Organic Compost (5kg).", NotificationType.ORDER_PLACED, "/farmer/orders")
        );

        notificationRepository.saveAll(notifications);
        logger.info("Seeded platform notifications");
    }
}
