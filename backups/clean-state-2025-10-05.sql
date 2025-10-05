-- Joantee Clean State Backup - 2025-10-05T18:24:17.035Z
-- This backup contains the clean production-ready state
-- Generated after database reset and delivery zone setup

-- Disable foreign key checks temporarily
SET session_replication_role = replica;


-- Data for table ghana_regions
DELETE FROM ghana_regions;
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (1, 'Greater Accra', 'GA', true, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (2, 'Ashanti', 'AS', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (3, 'Western', 'WE', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (4, 'Eastern', 'EA', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (5, 'Volta', 'VO', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (6, 'Central', 'CE', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (7, 'Northern', 'NO', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (8, 'Upper East', 'UE', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (9, 'Upper West', 'UW', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (10, 'Brong-Ahafo', 'BA', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (11, 'Western North', 'WN', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (12, 'Ahafo', 'AH', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (13, 'Bono', 'BO', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (14, 'Bono East', 'BE', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (15, 'Oti', 'OT', false, '2025-10-04T19:43:18.650Z');
INSERT INTO ghana_regions (id, name, code, is_active, created_at) VALUES (16, 'Savannah', 'SA', false, '2025-10-04T19:43:18.650Z');


-- Data for table ghana_cities
DELETE FROM ghana_cities;
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (1, 1, 'Ablekuma', true, '2025-10-05T18:12:57.667Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (2, 1, 'Accra', true, '2025-10-05T18:12:57.892Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (3, 1, 'Ada', true, '2025-10-05T18:12:58.066Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (4, 1, 'Adenta', true, '2025-10-05T18:12:58.242Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (5, 1, 'Achimota', true, '2025-10-05T18:12:58.451Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (6, 1, 'Afienya', true, '2025-10-05T18:12:58.658Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (7, 1, 'Agbogba', true, '2025-10-05T18:12:58.881Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (8, 1, 'Amasaman', true, '2025-10-05T18:12:59.058Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (9, 1, 'Ashaiman', true, '2025-10-05T18:12:59.250Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (10, 1, 'Ashaley Botwe', true, '2025-10-05T18:12:59.429Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (11, 1, 'Atomic Hills', true, '2025-10-05T18:12:59.624Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (12, 1, 'Ayawaso', true, '2025-10-05T18:12:59.818Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (13, 1, 'Baatsona', true, '2025-10-05T18:12:59.994Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (14, 1, 'Cantonments', true, '2025-10-05T18:13:00.161Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (15, 1, 'Dansoman', true, '2025-10-05T18:13:00.466Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (16, 1, 'Dodowa', true, '2025-10-05T18:13:00.738Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (17, 1, 'Dome', true, '2025-10-05T18:13:00.988Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (18, 1, 'East Legon', true, '2025-10-05T18:13:01.179Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (19, 1, 'Ga East', true, '2025-10-05T18:13:01.386Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (20, 1, 'Ga North', true, '2025-10-05T18:13:01.570Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (21, 1, 'Ga South', true, '2025-10-05T18:13:01.991Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (22, 1, 'Ga West', true, '2025-10-05T18:13:02.148Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (23, 1, 'Gbawe', true, '2025-10-05T18:13:02.307Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (24, 1, 'Haatso', true, '2025-10-05T18:13:02.485Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (25, 1, 'James Town', true, '2025-10-05T18:13:02.770Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (26, 1, 'Kaneshie', true, '2025-10-05T18:13:02.955Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (27, 1, 'Korle Klottey', true, '2025-10-05T18:13:03.155Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (28, 1, 'Korle Gonno', true, '2025-10-05T18:13:03.412Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (29, 1, 'Kpone', true, '2025-10-05T18:13:03.587Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (30, 1, 'Krowor', true, '2025-10-05T18:13:03.808Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (31, 1, 'Kwabenya', true, '2025-10-05T18:13:04.022Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (32, 1, 'La', true, '2025-10-05T18:13:04.191Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (33, 1, 'Labadi', true, '2025-10-05T18:13:04.370Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (34, 1, 'Labone', true, '2025-10-05T18:13:04.594Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (35, 1, 'Ledzokuku', true, '2025-10-05T18:13:04.850Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (36, 1, 'Madina', true, '2025-10-05T18:13:05.027Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (37, 1, 'Mallam', true, '2025-10-05T18:13:05.194Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (38, 1, 'Mamprobi', true, '2025-10-05T18:13:05.375Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (39, 1, 'New Legon', true, '2025-10-05T18:13:05.572Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (40, 1, 'Ningo', true, '2025-10-05T18:13:05.749Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (41, 1, 'North Legon', true, '2025-10-05T18:13:06.124Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (42, 1, 'Nungua', true, '2025-10-05T18:13:06.378Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (43, 1, 'Ofankor', true, '2025-10-05T18:13:06.570Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (44, 1, 'Okaikwei', true, '2025-10-05T18:13:06.756Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (45, 1, 'Old Ashongman', true, '2025-10-05T18:13:06.934Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (46, 1, 'New Ashongman', true, '2025-10-05T18:13:07.111Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (47, 1, 'Osu', true, '2025-10-05T18:13:07.412Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (48, 1, 'Pantang', true, '2025-10-05T18:13:07.651Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (49, 1, 'Pokuase', true, '2025-10-05T18:13:07.874Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (50, 1, 'Prampram', true, '2025-10-05T18:13:08.059Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (51, 1, 'Sakumono', true, '2025-10-05T18:13:08.227Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (52, 1, 'Sege', true, '2025-10-05T18:13:08.389Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (53, 1, 'Shai Osudoku', true, '2025-10-05T18:13:08.554Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (54, 1, 'South Legon', true, '2025-10-05T18:13:08.722Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (55, 1, 'Spintex', true, '2025-10-05T18:13:09.411Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (56, 1, 'Tema', true, '2025-10-05T18:13:09.717Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (57, 1, 'Tesano', true, '2025-10-05T18:13:10.299Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (58, 1, 'Teshie', true, '2025-10-05T18:13:10.492Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (59, 1, 'Weija', true, '2025-10-05T18:13:10.683Z');
INSERT INTO ghana_cities (id, region_id, name, is_active, created_at) VALUES (60, 1, 'West Legon', true, '2025-10-05T18:13:10.934Z');


-- Data for table delivery_zones
DELETE FROM delivery_zones;
INSERT INTO delivery_zones (id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at, updated_at) VALUES (2, 'Accra & Nearby Areas', 'Delivery to areas in and close to Accra', '30.00', '1-2 days', NULL, true, '2025-10-05T18:20:42.499Z', '2025-10-05T18:20:42.499Z');
INSERT INTO delivery_zones (id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at, updated_at) VALUES (3, 'Farther Areas', 'Delivery to areas farther from Accra', '60.00', '2-3 days', NULL, true, '2025-10-05T18:20:42.691Z', '2025-10-05T18:20:42.691Z');


-- Data for table delivery_zone_areas
DELETE FROM delivery_zone_areas;
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (85, 2, 1, 2, 'All Areas', '2025-10-05T18:20:43.031Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (86, 2, 1, 36, 'All Areas', '2025-10-05T18:20:43.395Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (87, 2, 1, 4, 'All Areas', '2025-10-05T18:20:43.747Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (88, 2, 1, 18, 'All Areas', '2025-10-05T18:20:44.123Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (89, 2, 1, 60, 'All Areas', '2025-10-05T18:20:44.469Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (90, 2, 1, 41, 'All Areas', '2025-10-05T18:20:44.843Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (91, 2, 1, 54, 'All Areas', '2025-10-05T18:20:45.211Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (92, 2, 1, 55, 'All Areas', '2025-10-05T18:20:45.587Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (93, 2, 1, 47, 'All Areas', '2025-10-05T18:20:45.957Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (94, 2, 1, 32, 'All Areas', '2025-10-05T18:20:46.364Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (95, 2, 1, 33, 'All Areas', '2025-10-05T18:20:46.718Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (96, 2, 1, 34, 'All Areas', '2025-10-05T18:20:47.115Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (97, 2, 1, 14, 'All Areas', '2025-10-05T18:20:47.477Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (98, 2, 1, 5, 'All Areas', '2025-10-05T18:20:48.035Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (99, 2, 1, 26, 'All Areas', '2025-10-05T18:20:48.436Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (100, 2, 1, 27, 'All Areas', '2025-10-05T18:20:48.781Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (101, 2, 1, 28, 'All Areas', '2025-10-05T18:20:49.156Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (102, 2, 1, 25, 'All Areas', '2025-10-05T18:20:49.532Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (103, 2, 1, 38, 'All Areas', '2025-10-05T18:20:49.907Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (104, 2, 1, 15, 'All Areas', '2025-10-05T18:20:50.276Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (105, 2, 1, 59, 'All Areas', '2025-10-05T18:20:50.643Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (106, 2, 1, 23, 'All Areas', '2025-10-05T18:20:51.027Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (107, 2, 1, 37, 'All Areas', '2025-10-05T18:20:51.413Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (108, 2, 1, 13, 'All Areas', '2025-10-05T18:20:51.771Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (109, 2, 1, 11, 'All Areas', '2025-10-05T18:20:52.133Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (110, 2, 1, 10, 'All Areas', '2025-10-05T18:20:52.475Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (111, 2, 1, 31, 'All Areas', '2025-10-05T18:20:52.868Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (112, 2, 1, 24, 'All Areas', '2025-10-05T18:20:53.244Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (113, 2, 1, 48, 'All Areas', '2025-10-05T18:20:53.611Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (114, 2, 1, 49, 'All Areas', '2025-10-05T18:20:53.988Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (115, 2, 1, 43, 'All Areas', '2025-10-05T18:20:54.373Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (116, 2, 1, 57, 'All Areas', '2025-10-05T18:20:54.708Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (117, 2, 1, 12, 'All Areas', '2025-10-05T18:20:55.269Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (118, 2, 1, 1, 'All Areas', '2025-10-05T18:20:55.612Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (119, 2, 1, 44, 'All Areas', '2025-10-05T18:20:56.035Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (120, 2, 1, 19, 'All Areas', '2025-10-05T18:20:56.379Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (121, 2, 1, 20, 'All Areas', '2025-10-05T18:20:56.732Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (122, 2, 1, 21, 'All Areas', '2025-10-05T18:20:57.139Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (123, 2, 1, 22, 'All Areas', '2025-10-05T18:20:57.499Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (124, 3, 1, 56, 'All Areas', '2025-10-05T18:20:58.411Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (125, 3, 1, 9, 'All Areas', '2025-10-05T18:20:58.789Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (126, 3, 1, 8, 'All Areas', '2025-10-05T18:20:59.812Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (127, 3, 1, 50, 'All Areas', '2025-10-05T18:21:00.412Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (128, 3, 1, 16, 'All Areas', '2025-10-05T18:21:00.787Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (129, 3, 1, 40, 'All Areas', '2025-10-05T18:21:01.141Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (130, 3, 1, 3, 'All Areas', '2025-10-05T18:21:01.507Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (131, 3, 1, 52, 'All Areas', '2025-10-05T18:21:01.861Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (132, 3, 1, 51, 'All Areas', '2025-10-05T18:21:02.659Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (133, 3, 1, 29, 'All Areas', '2025-10-05T18:21:03.038Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (134, 3, 1, 6, 'All Areas', '2025-10-05T18:21:03.364Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (135, 3, 1, 7, 'All Areas', '2025-10-05T18:21:03.716Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (136, 3, 1, 45, 'All Areas', '2025-10-05T18:21:04.068Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (137, 3, 1, 46, 'All Areas', '2025-10-05T18:21:04.411Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (138, 3, 1, 58, 'All Areas', '2025-10-05T18:21:04.787Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (139, 3, 1, 42, 'All Areas', '2025-10-05T18:21:05.156Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (140, 3, 1, 35, 'All Areas', '2025-10-05T18:21:05.532Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (141, 3, 1, 30, 'All Areas', '2025-10-05T18:21:05.893Z');
INSERT INTO delivery_zone_areas (id, delivery_zone_id, region_id, city_id, area_name, created_at) VALUES (142, 3, 1, 53, 'All Areas', '2025-10-05T18:21:06.373Z');


-- Data for table app_settings
DELETE FROM app_settings;
INSERT INTO app_settings (id, tax_rate, free_shipping_threshold, large_order_quantity_threshold, large_order_delivery_fee, pickup_address, currency_symbol, currency_code, updated_at) VALUES (1, '0.00', '100000.00', 100000, '15.00', '', '₵', 'GHS', '2025-10-05T18:16:07.263Z');


-- Data for table users
DELETE FROM users;
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, phone, department, last_login, refresh_token, refresh_token_expires_at, reset_token, reset_token_expires_at, oauth_provider, oauth_id, oauth_email, profile_picture_url, created_at, updated_at) VALUES (1, 'joanteebusiness@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05T18:11:43.716Z', '2025-10-05T18:11:43.716Z');


-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE brands_id_seq RESTART WITH 1;
ALTER SEQUENCE product_variants_id_seq RESTART WITH 1;
ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_segments_id_seq RESTART WITH 1;
ALTER SEQUENCE loyalty_programs_id_seq RESTART WITH 1;
ALTER SEQUENCE communication_campaigns_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_activity_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_loyalty_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_notes_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_preferences_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_tags_id_seq RESTART WITH 1;
ALTER SEQUENCE delivery_zone_areas_id_seq RESTART WITH 1;
ALTER SEQUENCE delivery_zones_id_seq RESTART WITH 1;
ALTER SEQUENCE ghana_regions_id_seq RESTART WITH 1;
ALTER SEQUENCE ghana_cities_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE pickup_locations_id_seq RESTART WITH 1;
ALTER SEQUENCE cart_items_id_seq RESTART WITH 1;
ALTER SEQUENCE carts_id_seq RESTART WITH 1;
ALTER SEQUENCE checkout_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_history_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_history_items_id_seq RESTART WITH 1;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_addresses_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;
