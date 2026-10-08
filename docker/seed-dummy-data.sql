-- ====================================================================
-- AgroLoop Database Seed Script: docker/seed-dummy-data.sql
-- Direct Execution:
--   docker exec -i <postgres-container> psql -U postgres -d agroloop < docker/seed-dummy-data.sql
-- Or via Make:
--   make seed-db
-- ====================================================================

\echo 'Seeding AgroLoop dummy data for Fleet and Marketplace...'

-- 1. SEED USERS, HOUSEHOLDS, FARMERS, ADMINS
INSERT INTO users (name, email, password_hash, role, enabled, created_at, updated_at)
VALUES
    ('System Administrator', 'admin@agroloop.com', '$2a$10$5Fo7jMqrcJhoPwVy8CYCMugyhqrHCJ6OhZNGK9E9Fdb/3Ag1sJ7fC', 'ROLE_ADMIN', true, NOW() - INTERVAL '30 days', NOW()),
    ('Alice Green', 'household@agroloop.com', '$2a$10$LsTR0BgqzSgeKG0JNIuhCeDHot2V44V18IQK4BmU0mERt2YAtP2RW', 'ROLE_HOUSEHOLD', true, NOW() - INTERVAL '25 days', NOW()),
    ('David Miller', 'david.household@agroloop.com', '$2a$10$LsTR0BgqzSgeKG0JNIuhCeDHot2V44V18IQK4BmU0mERt2YAtP2RW', 'ROLE_HOUSEHOLD', true, NOW() - INTERVAL '20 days', NOW()),
    ('Sarah Connor', 'sarah.household@agroloop.com', '$2a$10$LsTR0BgqzSgeKG0JNIuhCeDHot2V44V18IQK4BmU0mERt2YAtP2RW', 'ROLE_HOUSEHOLD', true, NOW() - INTERVAL '15 days', NOW()),
    ('Bob Farmer', 'farmer@agroloop.com', '$2a$10$0guwt2REbDTntCKV/os7xOwK4/AAUswO6lJZmVvMIaWqiFddgv1sy', 'ROLE_FARMER', true, NOW() - INTERVAL '30 days', NOW()),
    ('Priya Nair', 'priya.farmer@agroloop.com', '$2a$10$0guwt2REbDTntCKV/os7xOwK4/AAUswO6lJZmVvMIaWqiFddgv1sy', 'ROLE_FARMER', true, NOW() - INTERVAL '25 days', NOW()),
    ('Carlos Rivera', 'carlos.farmer@agroloop.com', '$2a$10$0guwt2REbDTntCKV/os7xOwK4/AAUswO6lJZmVvMIaWqiFddgv1sy', 'ROLE_FARMER', true, NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

INSERT INTO admins (id)
SELECT id FROM users WHERE email = 'admin@agroloop.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO households (id, token_balance, address)
VALUES
    ((SELECT id FROM users WHERE email = 'household@agroloop.com'), 250.00, 'Green View Residency, Flat 4B, MG Road, Kochi, Kerala'),
    ((SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 320.00, 'Palm Grove Heights, Villa 12, Thrissur, Kerala'),
    ((SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 185.00, 'Riverside Eco Villa, Block C, Aluva, Kerala')
ON CONFLICT (id) DO UPDATE SET token_balance = EXCLUDED.token_balance, address = EXCLUDED.address;

INSERT INTO farmers (id, farm_name, farm_address, notes, latitude, longitude, service_radius_km, max_daily_capacity_kg)
VALUES
    ((SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'Green Valley Organic Farm', 'Wayanad Agro Zone, Kerala', 'Certified organic farm specializing in vegetables, bio-fertilizers, and high-yield composting.', 10.8505, 76.2711, 35.0, 500.00),
    ((SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'Highland Eco Farm', 'Munnar Hills, Idukki District, Kerala', 'High-altitude organic orchard specializing in vermicompost, herbs, and biochar conditioning.', 10.0889, 77.0595, 30.0, 400.00),
    ((SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 'Sunburst Bio Orchards', 'Palakkad Agricultural Belt, Kerala', 'Regenerative farming cooperative producing tropical fruits, organic turmeric, and nursery saplings.', 10.7867, 76.6548, 40.0, 600.00)
ON CONFLICT (id) DO UPDATE SET
    farm_name = EXCLUDED.farm_name,
    farm_address = EXCLUDED.farm_address,
    notes = EXCLUDED.notes,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    service_radius_km = EXCLUDED.service_radius_km,
    max_daily_capacity_kg = EXCLUDED.max_daily_capacity_kg;


-- 2. SEED CIRCULAR MARKETPLACE PRODUCTS (23 Items Across All 6 Categories)
INSERT INTO products (id, farmer_id, name, description, category, unit, price_in_tokens, stock, image_url, active, created_at, updated_at)
VALUES
    -- COMPOST & SOIL
    (1, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Enriched Organic Compost (5kg)',
     'Microbe-rich organic compost produced from circular household waste. Ideal for home gardens and potted plants.',
     'COMPOST_AND_SOIL', '5kg Bag', 35.00, 45, '/images/products/compost.jpg', true, NOW() - INTERVAL '10 days', NOW()),
    
    (2, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Premium Vermicompost (10kg)',
     'Worm-castings enriched natural soil conditioner packed with nitrogen, phosphorus, and potassium.',
     'COMPOST_AND_SOIL', '10kg Bag', 60.00, 30, '/images/products/vermicompost.jpg', true, NOW() - INTERVAL '9 days', NOW()),
    
    (3, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Cold-Pressed Neem Oil Spray (500ml)',
     'Natural bio-pesticide protecting against aphids, mites, and fungal infections without chemical residues.',
     'COMPOST_AND_SOIL', '500ml Bottle', 25.00, 50, '/images/products/neem-spray.jpg', true, NOW() - INTERVAL '8 days', NOW()),
    
    (9, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Biochar Soil Conditioner & Inoculant (3kg)',
     'High-porosity activated horticultural biochar charged with beneficial mycorrhizae for maximum moisture retention.',
     'COMPOST_AND_SOIL', '3kg Bag', 42.00, 24, '/images/products/biochar.jpg', true, NOW() - INTERVAL '7 days', NOW()),
    
    (10, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Aged Mushroom Compost Mulch (15kg)',
     'Naturally decomposed wheat straw and organic peat substrate providing dense weed suppression and long-term soil carbon.',
     'COMPOST_AND_SOIL', '15kg Bag', 55.00, 18, '/images/products/mushroom-mulch.jpg', true, NOW() - INTERVAL '6 days', NOW()),

    -- ORGANIC VEGETABLES
    (4, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Heirloom Tomato Basket (2kg)',
     'Sun-ripened organic tomatoes grown purely on verified AgroLoop compost. Rich in natural acidity and sweet flavor.',
     'ORGANIC_VEGETABLES', '2kg Basket', 20.00, 25, '/images/products/tomatoes.jpg', true, NOW() - INTERVAL '5 days', NOW()),
    
    (5, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Fresh Farm Spinach & Greens Bundle',
     'Crisp pesticide-free organic greens harvested daily from the fertile Wayanad agro-valley.',
     'ORGANIC_VEGETABLES', '500g Bundle', 15.00, 40, '/images/products/spinach.jpg', true, NOW() - INTERVAL '4 days', NOW()),
    
    (11, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Crisp Tri-Color Bell Peppers (1kg)',
     'Greenhouse-grown sweet bell peppers nurtured with vermicompost tea for thick walls and vibrant coloration.',
     'ORGANIC_VEGETABLES', '1kg Box', 24.00, 32, '/images/products/bell-peppers.jpg', true, NOW() - INTERVAL '3 days', NOW()),
    
    (12, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Tender Organic Baby Carrots (1kg)',
     'Naturally sweet crunchy baby carrots pulled fresh from loose sandy loam conditioned with circular organics.',
     'ORGANIC_VEGETABLES', '1kg Bunch', 18.00, 28, '/images/products/carrots.jpg', true, NOW() - INTERVAL '2 days', NOW()),
    
    (13, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Farm Fresh Cucumbers & Ridge Gourd (2kg)',
     'Hydrating, non-waxed crisp cucumbers and tender ridge gourd cultivated with organic drip fertigation.',
     'ORGANIC_VEGETABLES', '2kg Basket', 22.00, 35, '/images/products/cucumbers.jpg', true, NOW() - INTERVAL '1 days', NOW()),

    -- FRESH FRUITS
    (6, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Organic Alphonso Mango Crate (3kg)',
     'Naturally tree-ripened sweet Alphonso mangoes cultivated with organic regenerative fertilizers and zero carbide.',
     'FRESH_FRUITS', '3kg Crate', 45.00, 15, '/images/products/mangoes.jpg', true, NOW() - INTERVAL '8 days', NOW()),
    
    (14, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Certified Organic Robusta Banana Bunch (2kg)',
     'Nutrient-dense potassium-rich bananas naturally harvested without artificial ethylene gas chambers.',
     'FRESH_FRUITS', '2kg Bunch', 16.00, 30, '/images/products/bananas.jpg', true, NOW() - INTERVAL '5 days', NOW()),
    
    (15, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Sweet Papaya & Passionfruit Box (2.5kg)',
     'Tropical antioxidant blend of sweet red lady papaya and tart purple passionfruits grown under shaded netting.',
     'FRESH_FRUITS', '2.5kg Box', 28.00, 20, '/images/products/papaya-box.jpg', true, NOW() - INTERVAL '3 days', NOW()),

    -- FARM DAIRY
    (7, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'A2 Fresh Farm Milk (1L)',
     'Raw pasteurized milk sourced from grass-fed indigenous cows fed certified organic fodder and silage.',
     'FARM_DAIRY', '1L Glass Bottle', 18.00, 50, '/images/products/milk.jpg', true, NOW() - INTERVAL '2 days', NOW()),
    
    (16, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Wayanad Wild Forest Honey (500g)',
     'Unheated, unpasteurized natural blossom honey hand-gathered by ethical forest beekeeping collectives.',
     'FARM_DAIRY', '500g Jar', 30.00, 25, '/images/products/honey.jpg', true, NOW() - INTERVAL '6 days', NOW()),
    
    (17, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Artisanal Probiotic Ghee (500ml)',
     'Traditional bilona-churned golden clarified butter cooked slowly over clay fire stoves.',
     'FARM_DAIRY', '500ml Jar', 55.00, 15, '/images/products/ghee.jpg', true, NOW() - INTERVAL '12 days', NOW()),
    
    (18, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Fresh Country Chicken Eggs (Pack of 12)',
     'Free-range pasture-raised brown eggs with rich golden yolks, high omega-3 fatty acids.',
     'FARM_DAIRY', 'Pack of 12', 22.00, 40, '/images/products/eggs.jpg', true, NOW() - INTERVAL '1 days', NOW()),

    -- SEEDS & SAPLINGS
    (8, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Heirloom Vegetable Starter Seeds (Pack of 5)',
     'Non-GMO open-pollinated seeds including Okra, Brinjal, Bird-Eye Chili, Bitter Gourd, and Malabar Spinach.',
     'SEEDS_AND_SAPLINGS', 'Pack of 5', 20.00, 60, '/images/products/seeds-pack.jpg', true, NOW() - INTERVAL '14 days', NOW()),
    
    (19, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Medicinal Herb Seed Kit (Pack of 6)',
     'Includes Holy Basil (Tulsi), Ashwagandha, Lemongrass, Brahmi, Mint, and Aloe Vera propagation seeds.',
     'SEEDS_AND_SAPLINGS', 'Pack of 6', 26.00, 35, '/images/products/herb-seeds.jpg', true, NOW() - INTERVAL '9 days', NOW()),
    
    (20, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'Fast-Growing Moringa Oleifera Saplings (2-Pack)',
     'Hardy, drought-tolerant drumstick tree saplings in biodegradable coir nursery pots ready for soil transplant.',
     'SEEDS_AND_SAPLINGS', '2-Pack Pots', 35.00, 20, '/images/products/moringa-saplings.jpg', true, NOW() - INTERVAL '7 days', NOW()),

    -- HERBS & SPICES
    (21, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'),
     'Fresh Culinary Sweet Basil & Mint Duo (250g)',
     'Aromatic Italian sweet basil and pungent garden spearmint snipped morning of dispatch for supreme freshness.',
     'HERBS_AND_SPICES', '250g Pack', 14.00, 40, '/images/products/basil-mint.jpg', true, NOW() - INTERVAL '4 days', NOW()),
    
    (22, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'),
     'High-Curcumin Organic Lakadong Turmeric (250g)',
     'Finely ground pure Lakadong turmeric powder with over 7.5% natural curcumin content. Solar-dried and unadulterated.',
     'HERBS_AND_SPICES', '250g Glass Jar', 38.00, 50, '/images/products/turmeric.jpg', true, NOW() - INTERVAL '11 days', NOW()),
    
    (23, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'),
     'Sun-Dried Tellicherry Black Peppercorns (200g)',
     'Extra-bold premium whole black peppercorns harvested from Wayanad vines. Intense floral heat and citrus finish.',
     'HERBS_AND_SPICES', '200g Pouch', 32.00, 35, '/images/products/black-pepper.jpg', true, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO UPDATE SET
    farmer_id = EXCLUDED.farmer_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    price_in_tokens = EXCLUDED.price_in_tokens,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url,
    active = EXCLUDED.active,
    updated_at = NOW();

SELECT setval('products_id_seq', (SELECT GREATEST(MAX(id), 23) FROM products));


-- 3. SEED WASTE SUBMISSIONS (Spanning Diverse Categories & Locations)
INSERT INTO waste_submissions (id, household_id, category, estimated_weight, pickup_address, image_path, notes, status, latitude, longitude, created_at, updated_at)
VALUES
    -- Queued / Requested
    (101, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'FOOD_SCRAPS', 6.50, 'Green View Residency, Flat 4B, MG Road, Kochi', '/images/waste/sub101.jpg', 'Kitchen fruit peelings and shredded vegetable tops.', 'SUBMITTED', 10.8505, 76.2711, NOW() - INTERVAL '2 hours', NOW()),
    (102, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'GARDEN_WASTE', 14.80, 'Palm Grove Heights, Villa 12, Thrissur', '/images/waste/sub102.jpg', 'Lawn clippings and pruned hibiscus branches bagged curbside.', 'SUBMITTED', 10.5276, 76.2144, NOW() - INTERVAL '4 hours', NOW()),
    (103, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 'COFFEE_GROUNDS', 5.20, 'Riverside Eco Villa, Block C, Aluva', '/images/waste/sub103.jpg', 'Spent espresso grounds and chamomile tea bags.', 'SUBMITTED', 10.1076, 76.3516, NOW() - INTERVAL '6 hours', NOW()),

    -- Claimed / Assigned
    (104, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'FOOD_SCRAPS', 11.00, 'Green View Residency, Flat 4B, MG Road, Kochi', '/images/waste/sub104.jpg', 'Fermented spent grain and bread dough residue.', 'CLAIMED', 10.8515, 76.2720, NOW() - INTERVAL '8 hours', NOW()),
    (105, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 'FOOD_SCRAPS', 8.40, 'Riverside Eco Villa, Block C, Aluva', '/images/waste/sub105.jpg', 'Meal preparation cuttings and crushed eggshells.', 'CLAIMED', 10.1085, 76.3525, NOW() - INTERVAL '10 hours', NOW()),

    -- Scheduled
    (106, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'FOOD_SCRAPS', 9.60, 'Palm Grove Heights, Villa 12, Thrissur', '/images/waste/sub106.jpg', 'Mixed fruit and vegetable scraps in biodegradable container.', 'CLAIMED', 10.5285, 76.2150, NOW() - INTERVAL '12 hours', NOW()),
    (107, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'COFFEE_GROUNDS', 4.80, 'Green View Residency, Flat 4B, MG Road, Kochi', '/images/waste/sub107.jpg', 'Pure dark roast coffee grounds and filter papers.', 'CLAIMED', 10.8525, 76.2730, NOW() - INTERVAL '14 hours', NOW()),

    -- Collected
    (108, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 'GARDEN_WASTE', 15.40, 'Riverside Eco Villa, Block C, Aluva', '/images/waste/sub108.jpg', 'Bamboo trimmings and mulch leaves.', 'CLAIMED', 10.1095, 76.3535, NOW() - INTERVAL '16 hours', NOW()),
    (109, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'FOOD_SCRAPS', 7.20, 'Palm Grove Heights, Villa 12, Thrissur', '/images/waste/sub109.jpg', 'Sorted daily kitchen biodegradables.', 'CLAIMED', 10.5295, 76.2160, NOW() - INTERVAL '18 hours', NOW()),

    -- Verified
    (110, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'FOOD_SCRAPS', 5.40, 'Green View Residency, Flat 4B, MG Road, Kochi', '/images/waste/sub110.jpg', 'Clean kitchen peels verified for vermicomposting.', 'CLAIMED', 10.8505, 76.2711, NOW() - INTERVAL '28 hours', NOW()),
    (111, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'GARDEN_WASTE', 19.00, 'Palm Grove Heights, Villa 12, Thrissur', '/images/waste/sub111.jpg', 'High-carbon dry foliage and hedge clippings.', 'CLAIMED', 10.5276, 76.2144, NOW() - INTERVAL '32 hours', NOW()),
    (112, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 'FOOD_SCRAPS', 10.50, 'Riverside Eco Villa, Block C, Aluva', '/images/waste/sub112.jpg', 'Community garden organic compost input.', 'CLAIMED', 10.1076, 76.3516, NOW() - INTERVAL '38 hours', NOW()),

    -- Cancelled
    (113, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'FOOD_SCRAPS', 3.00, 'Palm Grove Heights, Villa 12, Thrissur', '/images/waste/sub113.jpg', 'Cancelled batch prior to collection.', 'SUBMITTED', 10.5276, 76.2144, NOW() - INTERVAL '20 hours', NOW())
ON CONFLICT (id) DO UPDATE SET
    household_id = EXCLUDED.household_id,
    category = EXCLUDED.category,
    estimated_weight = EXCLUDED.estimated_weight,
    pickup_address = EXCLUDED.pickup_address,
    image_path = EXCLUDED.image_path,
    notes = EXCLUDED.notes,
    status = EXCLUDED.status,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

SELECT setval('waste_submissions_id_seq', (SELECT GREATEST(MAX(id), 113) FROM waste_submissions));


-- 4. SEED FLEET PICKUP REQUESTS (Covering Every Operational Status)
INSERT INTO pickup_requests (id, waste_submission_id, farmer_id, status, scheduled_time, collected_at, cancelled_at, cancellation_reason, created_at, updated_at)
VALUES
    -- REQUESTED (Queued in Dispatch Backlog)
    (101, 101, NULL, 'REQUESTED', NULL, NULL, NULL, NULL, NOW() - INTERVAL '2 hours', NOW()),
    (102, 102, NULL, 'REQUESTED', NULL, NULL, NULL, NULL, NOW() - INTERVAL '4 hours', NOW()),
    (103, 103, NULL, 'REQUESTED', NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 hours', NOW()),

    -- ASSIGNED (Claimed by Farmers)
    (104, 104, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'ASSIGNED', NULL, NULL, NULL, NULL, NOW() - INTERVAL '8 hours', NOW()),
    (105, 105, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'ASSIGNED', NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 hours', NOW()),

    -- SCHEDULED (Appointment Time Confirmed)
    (106, 106, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 'SCHEDULED', NOW() + INTERVAL '14 hours', NULL, NULL, NULL, NOW() - INTERVAL '12 hours', NOW()),
    (107, 107, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'SCHEDULED', NOW() + INTERVAL '18 hours', NULL, NULL, NULL, NOW() - INTERVAL '14 hours', NOW()),

    -- COLLECTED (Physical Waste Picked Up)
    (108, 108, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'COLLECTED', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hours', NULL, NULL, NOW() - INTERVAL '16 hours', NOW()),
    (109, 109, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'COLLECTED', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', NULL, NULL, NOW() - INTERVAL '18 hours', NOW()),

    -- VERIFIED (Weighed & Quality Graded at Facility)
    (110, 110, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'VERIFIED', NOW() - INTERVAL '26 hours', NOW() - INTERVAL '24 hours', NULL, NULL, NOW() - INTERVAL '28 hours', NOW()),
    (111, 111, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'VERIFIED', NOW() - INTERVAL '30 hours', NOW() - INTERVAL '28 hours', NULL, NULL, NOW() - INTERVAL '32 hours', NOW()),
    (112, 112, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 'VERIFIED', NOW() - INTERVAL '36 hours', NOW() - INTERVAL '34 hours', NULL, NULL, NOW() - INTERVAL '38 hours', NOW()),

    -- CANCELLED
    (113, 113, NULL, 'CANCELLED', NULL, NULL, NOW() - INTERVAL '18 hours', 'Household rescheduled to next weekend due to sudden travel.', NOW() - INTERVAL '20 hours', NOW())
ON CONFLICT (id) DO UPDATE SET
    waste_submission_id = EXCLUDED.waste_submission_id,
    farmer_id = EXCLUDED.farmer_id,
    status = EXCLUDED.status,
    scheduled_time = EXCLUDED.scheduled_time,
    collected_at = EXCLUDED.collected_at,
    cancelled_at = EXCLUDED.cancelled_at,
    cancellation_reason = EXCLUDED.cancellation_reason,
    updated_at = NOW();

SELECT setval('pickup_requests_id_seq', (SELECT GREATEST(MAX(id), 113) FROM pickup_requests));


-- 5. SEED WASTE VERIFICATIONS (Weight & Grade Logs)
INSERT INTO waste_verifications (id, pickup_request_id, farmer_id, verified_weight, quality_grade, verification_notes, verified_at)
VALUES
    (301, 110, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 5.20, 'GRADE_A', 'Clean segregated organic kitchen waste, zero plastics. Optimal for vermicomposting.', NOW() - INTERVAL '24 hours'),
    (302, 111, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 18.40, 'GRADE_A', 'Dry lawn clippings, tree prunings, and mulch matter. Excellent carbon feedstock.', NOW() - INTERVAL '28 hours'),
    (303, 112, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 9.80, 'GRADE_B', 'Mixed vegetable scraps with minor garden soil inclusions. Accepted for windrow composting.', NOW() - INTERVAL '34 hours')
ON CONFLICT (id) DO UPDATE SET
    pickup_request_id = EXCLUDED.pickup_request_id,
    farmer_id = EXCLUDED.farmer_id,
    verified_weight = EXCLUDED.verified_weight,
    quality_grade = EXCLUDED.quality_grade,
    verification_notes = EXCLUDED.verification_notes,
    verified_at = EXCLUDED.verified_at;

SELECT setval('waste_verifications_id_seq', (SELECT GREATEST(MAX(id), 303) FROM waste_verifications));


-- 6. SEED QR VERIFICATION HANDSHAKES
INSERT INTO pickup_handshakes (id, pickup_id, household_id, farmer_id, status, nonce, pass_code_hash, failed_attempts, issued_at, expires_at, consumed_at, verification_method, signature)
VALUES
    (901, 106, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 'ISSUED', 'nonce_106_seed_f7a8b9', 'hash_pass_code_106', 0, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '24 hours', NULL, NULL, 'sig_ed25519_mock_106'),
    (902, 107, (SELECT id FROM users WHERE email = 'household@agroloop.com'), (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'ISSUED', 'nonce_107_seed_a1b2c3', 'hash_pass_code_107', 0, NOW() - INTERVAL '1 hours', NOW() + INTERVAL '24 hours', NULL, NULL, 'sig_ed25519_mock_107'),
    (903, 108, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'CONSUMED', 'nonce_108_seed_d4e5f6', 'hash_pass_code_108', 0, NOW() - INTERVAL '5 hours', NOW() + INTERVAL '19 hours', NOW() - INTERVAL '1 hours', 'QR_SCAN', 'sig_ed25519_mock_108'),
    (904, 109, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'CONSUMED', 'nonce_109_seed_g7h8i9', 'hash_pass_code_109', 0, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '18 hours', NOW() - INTERVAL '3 hours', 'MANUAL_PASSCODE', 'sig_ed25519_mock_109'),
    (905, 110, (SELECT id FROM users WHERE email = 'household@agroloop.com'), (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'CONSUMED', 'nonce_110_seed_j0k1l2', 'hash_pass_code_110', 0, NOW() - INTERVAL '28 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '24 hours', 'QR_SCAN', 'sig_ed25519_mock_110'),
    (906, 111, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 'CONSUMED', 'nonce_111_seed_m3n4o5', 'hash_pass_code_111', 0, NOW() - INTERVAL '32 hours', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '28 hours', 'QR_SCAN', 'sig_ed25519_mock_111'),
    (907, 112, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), 'CONSUMED', 'nonce_112_seed_p6q7r8', 'hash_pass_code_112', 0, NOW() - INTERVAL '38 hours', NOW() - INTERVAL '14 hours', NOW() - INTERVAL '34 hours', 'QR_SCAN', 'sig_ed25519_mock_112')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    consumed_at = EXCLUDED.consumed_at,
    verification_method = EXCLUDED.verification_method;

SELECT setval('pickup_handshakes_id_seq', (SELECT GREATEST(MAX(id), 907) FROM pickup_handshakes));

UPDATE pickup_requests SET latest_handshake_id = 901 WHERE id = 106;
UPDATE pickup_requests SET latest_handshake_id = 902 WHERE id = 107;
UPDATE pickup_requests SET latest_handshake_id = 903 WHERE id = 108;
UPDATE pickup_requests SET latest_handshake_id = 904 WHERE id = 109;
UPDATE pickup_requests SET latest_handshake_id = 905 WHERE id = 110;
UPDATE pickup_requests SET latest_handshake_id = 906 WHERE id = 111;
UPDATE pickup_requests SET latest_handshake_id = 907 WHERE id = 112;


-- 7. SEED COLLECTION FLEET ROUTES & STOPS
INSERT INTO collection_routes (id, farmer_id, route_date, status, total_distance_km, total_estimated_weight, notes, created_at, updated_at)
VALUES
    (201, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), CURRENT_DATE, 'IN_PROGRESS', 24.50, 23.40, 'Route #201: Morning Kochi-Wayanad Organic Corridor. Prioritizing Grade A segregated kitchen batches.', NOW() - INTERVAL '4 hours', NOW()),
    (202, (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), CURRENT_DATE + 1, 'PLANNED', 18.20, 23.80, 'Route #202: Munnar Valley High-Altitude Bio-Waste Express.', NOW() - INTERVAL '6 hours', NOW()),
    (203, (SELECT id FROM users WHERE email = 'carlos.farmer@agroloop.com'), CURRENT_DATE - 1, 'COMPLETED', 32.00, 31.50, 'Route #203: Palakkad Agricultural Belt Collection Run.', NOW() - INTERVAL '2 days', NOW())
ON CONFLICT (id) DO UPDATE SET
    farmer_id = EXCLUDED.farmer_id,
    route_date = EXCLUDED.route_date,
    status = EXCLUDED.status,
    total_distance_km = EXCLUDED.total_distance_km,
    total_estimated_weight = EXCLUDED.total_estimated_weight,
    notes = EXCLUDED.notes,
    updated_at = NOW();

SELECT setval('collection_routes_id_seq', (SELECT GREATEST(MAX(id), 203) FROM collection_routes));

INSERT INTO route_stops (id, route_id, pickup_id, stop_order, status, estimated_distance_from_prev_km, completed_at, notes)
VALUES
    -- Stops for Route 201 (Bob Farmer)
    (501, 201, 110, 1, 'COMPLETED', 4.20, NOW() - INTERVAL '3 hours', 'Stop 1: Green View Residency - Verified 5.2kg Grade A kitchen waste.'),
    (502, 201, 109, 2, 'COMPLETED', 6.80, NOW() - INTERVAL '2 hours', 'Stop 2: Palm Grove Heights - Collected 7.2kg kitchen waste.'),
    (503, 201, 107, 3, 'PENDING', 5.50, NULL, 'Stop 3: Green View Residency - Pending collection slot at 03:00 PM.'),

    -- Stops for Route 202 (Priya Nair)
    (504, 202, 105, 1, 'PENDING', 8.10, NULL, 'Stop 1: Riverside Eco Villa - Scheduled morning pickup.'),
    (505, 202, 108, 2, 'PENDING', 10.10, NULL, 'Stop 2: Riverside Eco Villa - High volume garden trimmings.'),

    -- Stops for Route 203 (Carlos Rivera)
    (506, 203, 112, 1, 'COMPLETED', 14.50, NOW() - INTERVAL '30 hours', 'Completed full inspection. Grade B windrow input.'),
    (507, 203, 106, 2, 'COMPLETED', 17.50, NOW() - INTERVAL '28 hours', 'Successfully gathered mixed organics.')
ON CONFLICT (id) DO UPDATE SET
    route_id = EXCLUDED.route_id,
    pickup_id = EXCLUDED.pickup_id,
    stop_order = EXCLUDED.stop_order,
    status = EXCLUDED.status,
    estimated_distance_from_prev_km = EXCLUDED.estimated_distance_from_prev_km,
    completed_at = EXCLUDED.completed_at,
    notes = EXCLUDED.notes;

SELECT setval('route_stops_id_seq', (SELECT GREATEST(MAX(id), 507) FROM route_stops));


-- 8. SEED MARKETPLACE ORDERS & ORDER ITEMS
INSERT INTO orders (id, household_id, total_tokens, status, delivery_address, notes, created_at)
VALUES
    (401, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 35.00, 'COMPLETED', 'Green View Residency, Flat 4B, MG Road, Kochi', 'Deliver to the front porch garden container.', NOW() - INTERVAL '15 days'),
    (402, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 38.00, 'PLACED', 'Palm Grove Heights, Villa 12, Thrissur', 'Leave with building reception if away.', NOW() - INTERVAL '2 days'),
    (403, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 42.00, 'PLACED', 'Riverside Eco Villa, Block C, Aluva', 'Please call before delivery dispatch.', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO UPDATE SET
    household_id = EXCLUDED.household_id,
    total_tokens = EXCLUDED.total_tokens,
    status = EXCLUDED.status,
    delivery_address = EXCLUDED.delivery_address,
    notes = EXCLUDED.notes;

SELECT setval('orders_id_seq', (SELECT GREATEST(MAX(id), 403) FROM orders));

INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal, unit, category, farmer_name, farmer_id)
VALUES
    (601, 401, 1, 'Enriched Organic Compost (5kg)', 35.00, 1, 35.00, '5kg Bag', 'COMPOST_AND_SOIL', 'Bob Farmer', (SELECT id FROM users WHERE email = 'farmer@agroloop.com')),
    (602, 402, 4, 'Heirloom Tomato Basket (2kg)', 20.00, 1, 20.00, '2kg Basket', 'ORGANIC_VEGETABLES', 'Bob Farmer', (SELECT id FROM users WHERE email = 'farmer@agroloop.com')),
    (603, 402, 7, 'A2 Fresh Farm Milk (1L)', 18.00, 1, 18.00, '1L Glass Bottle', 'FARM_DAIRY', 'Bob Farmer', (SELECT id FROM users WHERE email = 'farmer@agroloop.com')),
    (604, 403, 9, 'Biochar Soil Conditioner & Inoculant (3kg)', 42.00, 1, 42.00, '3kg Bag', 'COMPOST_AND_SOIL', 'Priya Nair', (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'))
ON CONFLICT (id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    product_name = EXCLUDED.product_name,
    unit_price = EXCLUDED.unit_price,
    quantity = EXCLUDED.quantity,
    subtotal = EXCLUDED.subtotal,
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    farmer_name = EXCLUDED.farmer_name,
    farmer_id = EXCLUDED.farmer_id;

SELECT setval('order_items_id_seq', (SELECT GREATEST(MAX(id), 604) FROM order_items));


-- 9. SEED ECOTOKEN TRANSACTIONS
-- Note: ecotoken_transactions table has an immutable trigger that disallows updates. ON CONFLICT DO NOTHING is used.
INSERT INTO ecotoken_transactions (id, household_id, waste_verification_id, amount, transaction_type, balance_after, description, order_id, direction, actor_id, created_at)
VALUES
    (701, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 301, 52.00, 'REWARD_MINTED', 202.00, 'EcoTokens rewarded for Grade A verified waste pickup #110', NULL, 'CREDIT', NULL, NOW() - INTERVAL '22 hours'),
    (702, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 302, 184.00, 'REWARD_MINTED', 358.00, 'EcoTokens rewarded for Grade A verified waste pickup #111', NULL, 'CREDIT', NULL, NOW() - INTERVAL '26 hours'),
    (703, (SELECT id FROM users WHERE email = 'sarah.household@agroloop.com'), 303, 88.00, 'REWARD_MINTED', 227.00, 'EcoTokens rewarded for Grade B verified waste pickup #112', NULL, 'CREDIT', NULL, NOW() - INTERVAL '32 hours'),
    (704, (SELECT id FROM users WHERE email = 'household@agroloop.com'), NULL, 35.00, 'MARKETPLACE_PURCHASE', 167.00, 'Marketplace Purchase: Order #401', 401, 'DEBIT', (SELECT id FROM users WHERE email = 'household@agroloop.com'), NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('ecotoken_transactions_id_seq', (SELECT GREATEST(MAX(id), 704) FROM ecotoken_transactions));


-- 10. SEED REVIEWS & RATINGS
INSERT INTO reviews (id, reviewer_id, reviewee_id, pickup_id, order_id, review_type, rating, comment, created_at, updated_at)
VALUES
    (801, (SELECT id FROM users WHERE email = 'household@agroloop.com'), (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 110, NULL, 'PICKUP_EXPERIENCE', 5, 'Prompt, courteous waste pickup! Highly recommend Farmer Bob for organic collections.', NOW() - INTERVAL '20 hours', NOW()),
    (802, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), (SELECT id FROM users WHERE email = 'priya.farmer@agroloop.com'), 111, NULL, 'PICKUP_EXPERIENCE', 5, 'Priya arrived right on schedule and verified the garden clippings cleanly.', NOW() - INTERVAL '24 hours', NOW()),
    (803, (SELECT id FROM users WHERE email = 'household@agroloop.com'), (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), NULL, 401, 'COMPOST_QUALITY', 5, 'Exceptional compost quality. My tomatoes have grown twice as fast!', NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO UPDATE SET
    reviewer_id = EXCLUDED.reviewer_id,
    reviewee_id = EXCLUDED.reviewee_id,
    pickup_id = EXCLUDED.pickup_id,
    order_id = EXCLUDED.order_id,
    review_type = EXCLUDED.review_type,
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    updated_at = NOW();

SELECT setval('reviews_id_seq', (SELECT GREATEST(MAX(id), 803) FROM reviews));


-- 11. SEED SYSTEM NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, action_url, is_read, created_at)
VALUES
    (951, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'EcoTokens Rewarded', 'You received +52.00 ECO for verified Grade-A organic waste submission.', 'TOKENS_MINTED', '/household/ledger', true, NOW() - INTERVAL '22 hours'),
    (952, (SELECT id FROM users WHERE email = 'household@agroloop.com'), 'Order Delivered', 'Your order for Enriched Organic Compost (5kg) has been completed.', 'ORDER_STATUS_CHANGED', '/orders/401', true, NOW() - INTERVAL '15 days'),
    (953, (SELECT id FROM users WHERE email = 'david.household@agroloop.com'), 'Pickup Scheduled', 'Farmer Carlos Rivera confirmed collection for tomorrow at 10:30 AM.', 'PICKUP_SCHEDULED', '/household/pickups', false, NOW() - INTERVAL '2 hours'),
    (954, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'Nearby Waste Available', 'A new 14.8kg Garden Waste submission is available in your service radius.', 'NEW_NEARBY_WASTE', '/farmer/pickups', false, NOW() - INTERVAL '4 hours'),
    (955, (SELECT id FROM users WHERE email = 'farmer@agroloop.com'), 'New Order Received', 'Household Alice Green purchased Enriched Organic Compost (5kg).', 'ORDER_PLACED', '/farmer/orders', true, NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    type = EXCLUDED.type,
    action_url = EXCLUDED.action_url,
    is_read = EXCLUDED.is_read;

SELECT setval('notifications_id_seq', (SELECT GREATEST(MAX(id), 955) FROM notifications));

\echo 'AgroLoop dummy data successfully seeded into database!'
