-- Mobile POS Database Backup
-- Generated at: 2026-10-14T17:22:37.131Z

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int NOT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `audit_logs`
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (1, 1, 'create', 'purchase_order', 1, '{"subtotal":65000,"itemCount":2,"totalAmount":65000}', '2026-10-08 08:30:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (2, 100048, 'create', 'purchase_order', 12, '{"subtotal":260000,"itemCount":2,"totalAmount":260000}', '2026-10-13 08:52:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (3, 100048, 'create', 'sale_order', 1, '{"subtotal":294500,"itemCount":2,"totalAmount":294500}', '2026-10-13 08:52:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (4, 100052, 'create', 'purchase_order', 15, '{"subtotal":260000,"itemCount":2,"totalAmount":260000}', '2026-10-13 08:53:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (5, 100052, 'create', 'sale_order', 2, '{"subtotal":294500,"itemCount":2,"totalAmount":294500}', '2026-10-13 08:53:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (8, 100060, 'create', 'purchase_order', 21, '{"subtotal":260000,"itemCount":2,"totalAmount":260000}', '2026-10-13 08:53:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (9, 100060, 'create', 'sale_order', 4, '{"subtotal":294500,"itemCount":2,"totalAmount":294500}', '2026-10-13 08:53:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (14, 100076, 'create', 'purchase_order', 32, '{"subtotal":85000,"itemCount":1,"totalAmount":85000}', '2026-10-13 08:58:54');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (57, 100000, 'create_business', 'business', 86, '{"code":"NBIZ_194135","name":"New Company 194135","adminId":100139,"branchId":111}', '2026-10-13 14:36:34');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (58, 100000, 'create_branch', 'branch', 112, '{"code":"NBR_194609","name":"North Branch 194609","planId":2,"businessId":85}', '2026-10-13 14:36:34');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (60, 100000, 'reject_subscription_payment', 'subscription_payments', 2, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 14:36:34');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (62, 100000, 'approve_subscription_payment', 'subscription_payments', 2, '{"amount":"49.00","branchId":109,"businessId":85,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 14:36:35');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (63, 100000, 'create_company_admin', 'users', 100140, '{"email":"replacement_admin_195063@test.local","businessId":85,"replacedAdminId":100136}', '2026-10-13 14:36:35');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (64, 100000, 'delete_company_admin', 'users', 100140, '{"email":"replacement_admin_195063@test.local","fullName":"Replacement Admin"}', '2026-10-13 14:36:35');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (67, 100000, 'create_business', 'business', 92, '{"code":"NBIZ_982554","name":"New Company 982554","adminId":100147,"branchId":120}', '2026-10-13 14:49:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (68, 100000, 'create_branch', 'branch', 121, '{"code":"NBR_982954","name":"North Branch 982954","planId":2,"businessId":91}', '2026-10-13 14:49:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (70, 100000, 'reject_subscription_payment', 'subscription_payments', 3, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 14:49:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (72, 100000, 'approve_subscription_payment', 'subscription_payments', 3, '{"amount":"49.00","branchId":118,"businessId":91,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 14:49:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (73, 100000, 'create_company_admin', 'users', 100148, '{"email":"replacement_admin_983378@test.local","businessId":91,"replacedAdminId":100145}', '2026-10-13 14:49:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (74, 100000, 'delete_company_admin', 'users', 100148, '{"email":"replacement_admin_983378@test.local","fullName":"Replacement Admin"}', '2026-10-13 14:49:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (77, 100000, 'create_business', 'business', 98, '{"code":"NBIZ_299101","name":"New Company 299101","adminId":100156,"branchId":129}', '2026-10-13 14:54:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (78, 100000, 'create_branch', 'branch', 130, '{"code":"NBR_299642","name":"North Branch 299642","planId":2,"businessId":97}', '2026-10-13 14:54:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (80, 100000, 'reject_subscription_payment', 'subscription_payments', 4, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 14:54:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (81, 100000, 'approve_subscription_payment', 'subscription_payments', 4, '{"amount":"49.00","branchId":127,"businessId":97,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 14:55:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (83, 100000, 'create_company_admin', 'users', 100157, '{"email":"replacement_admin_300087@test.local","businessId":97,"replacedAdminId":100154}', '2026-10-13 14:55:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (84, 100000, 'delete_company_admin', 'users', 100157, '{"email":"replacement_admin_300087@test.local","fullName":"Replacement Admin"}', '2026-10-13 14:55:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (87, 100000, 'create_business', 'business', 104, '{"code":"NBIZ_136349","name":"New Company 136349","adminId":100168,"branchId":138}', '2026-10-13 15:25:36');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (88, 100000, 'create_branch', 'branch', 139, '{"code":"NBR_136821","name":"North Branch 136821","planId":2,"businessId":103}', '2026-10-13 15:25:36');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (90, 100000, 'reject_subscription_payment', 'subscription_payments', 5, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:25:37');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (92, 100000, 'approve_subscription_payment', 'subscription_payments', 5, '{"amount":"49.00","branchId":136,"businessId":103,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:25:37');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (93, 100000, 'create_company_admin', 'users', 100169, '{"email":"replacement_admin_137259@test.local","businessId":103,"replacedAdminId":100166}', '2026-10-13 15:25:37');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (94, 100000, 'delete_company_admin', 'users', 100169, '{"email":"replacement_admin_137259@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:25:37');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (97, 100000, 'create_business', 'business', 110, '{"code":"NBIZ_838172","name":"New Company 838172","adminId":100179,"branchId":147}', '2026-10-13 15:37:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (98, 100000, 'create_branch', 'branch', 148, '{"code":"NBR_838694","name":"North Branch 838694","planId":2,"businessId":109}', '2026-10-13 15:37:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (100, 100000, 'reject_subscription_payment', 'subscription_payments', 6, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:37:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (101, 100000, 'approve_subscription_payment', 'subscription_payments', 6, '{"amount":"49.00","branchId":145,"businessId":109,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:37:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (103, 100000, 'create_company_admin', 'users', 100180, '{"email":"replacement_admin_839300@test.local","businessId":109,"replacedAdminId":100176}', '2026-10-13 15:37:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (104, 100000, 'delete_company_admin', 'users', 100180, '{"email":"replacement_admin_839300@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:37:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (107, 100000, 'reject_subscription_payment', 'subscription_payments', 7, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:42:15');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (108, 100000, 'approve_subscription_payment', 'subscription_payments', 7, '{"amount":"49.00","branchId":154,"businessId":115,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:42:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (109, 100000, 'create_company_admin', 'users', 100189, '{"email":"replacement_admin_136059@test.local","businessId":115,"replacedAdminId":100187}', '2026-10-13 15:42:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (110, 100000, 'delete_company_admin', 'users', 100189, '{"email":"replacement_admin_136059@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:42:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (115, 100000, 'reject_subscription_payment', 'subscription_payments', 8, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:43:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (116, 100000, 'approve_subscription_payment', 'subscription_payments', 8, '{"amount":"49.00","branchId":158,"businessId":118,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:43:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (117, 100000, 'create_company_admin', 'users', 100192, '{"email":"replacement_admin_183701@test.local","businessId":118,"replacedAdminId":100191}', '2026-10-13 15:43:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (118, 100000, 'delete_company_admin', 'users', 100192, '{"email":"replacement_admin_183701@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:43:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (119, 100000, 'create_business', 'business', 120, '{"code":"NCO_99","name":"New Co","adminId":100193,"branchId":159}', '2026-10-13 15:43:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (120, 100000, 'create_business', 'business', 125, '{"code":"NBIZ_343906","name":"New Company 343906","adminId":100201,"branchId":165}', '2026-10-13 15:45:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (121, 100000, 'create_branch', 'branch', 166, '{"code":"TTB_343443-NBR_344353","name":"North Branch 344353","planId":2,"businessId":124}', '2026-10-13 15:45:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (124, 100000, 'reject_subscription_payment', 'subscription_payments', 9, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:45:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (125, 100000, 'approve_subscription_payment', 'subscription_payments', 9, '{"amount":"49.00","branchId":163,"businessId":124,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:45:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (126, 100000, 'create_company_admin', 'users', 100202, '{"email":"replacement_admin_344817@test.local","businessId":124,"replacedAdminId":100199}', '2026-10-13 15:45:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (127, 100000, 'delete_company_admin', 'users', 100202, '{"email":"replacement_admin_344817@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:45:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (130, 100000, 'create_business', 'business', 131, '{"code":"NBIZ_400298","name":"New Company 400298","adminId":100209,"branchId":174}', '2026-10-13 15:46:40');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (131, 100000, 'create_branch', 'branch', 175, '{"code":"TTB_399833-NBR_400745","name":"North Branch 400745","planId":2,"businessId":130}', '2026-10-13 15:46:40');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (134, 100000, 'reject_subscription_payment', 'subscription_payments', 10, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:46:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (135, 100000, 'approve_subscription_payment', 'subscription_payments', 10, '{"amount":"49.00","branchId":172,"businessId":130,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:46:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (136, 100000, 'create_company_admin', 'users', 100210, '{"email":"replacement_admin_401231@test.local","businessId":130,"replacedAdminId":100207}', '2026-10-13 15:46:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (137, 100000, 'delete_company_admin', 'users', 100210, '{"email":"replacement_admin_401231@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:46:41');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (140, 100000, 'create_business', 'business', 138, '{"code":"NBIZ_463908","name":"New Company 463908","adminId":100217,"branchId":183}', '2026-10-13 15:47:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (141, 100000, 'create_branch', 'branch', 184, '{"code":"TTB_463563-NBR_464366","name":"North Branch 464366","planId":2,"businessId":137}', '2026-10-13 15:47:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (143, 100000, 'reject_subscription_payment', 'subscription_payments', 11, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 15:47:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (144, 100000, 'approve_subscription_payment', 'subscription_payments', 11, '{"amount":"49.00","branchId":181,"businessId":137,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 15:47:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (146, 100000, 'create_company_admin', 'users', 100218, '{"email":"replacement_admin_464801@test.local","businessId":137,"replacedAdminId":100215}', '2026-10-13 15:47:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (147, 100000, 'delete_company_admin', 'users', 100218, '{"email":"replacement_admin_464801@test.local","fullName":"Replacement Admin"}', '2026-10-13 15:47:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (148, 100000, 'create_branch', 'branch', 185, '{"code":"AMMZ5-01","name":"Main Branch","planId":1,"businessId":139}', '2026-10-13 15:47:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (149, 100000, 'create_branch', 'branch', 186, '{"code":"AMMZ5-02","name":"Saddar Branch","planId":1,"businessId":139}', '2026-10-13 15:47:45');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (152, 100000, 'create_business', 'business', 145, '{"code":"NBIZ_786377","name":"New Company 786377","adminId":100237,"branchId":194}', '2026-10-13 18:56:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (153, 100000, 'create_branch', 'branch', 195, '{"code":"TTB_785947-NBR_786854","name":"North Branch 786854","planId":2,"businessId":144}', '2026-10-13 18:56:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (155, 100000, 'reject_subscription_payment', 'subscription_payments', 12, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (156, 100000, 'approve_subscription_payment', 'subscription_payments', 12, '{"amount":"49.00","branchId":192,"businessId":144,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (158, 100000, 'create_company_admin', 'users', 100238, '{"email":"replacement_admin_787360@test.local","businessId":144,"replacedAdminId":100235}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (159, 100000, 'delete_company_admin', 'users', 100238, '{"email":"replacement_admin_787360@test.local","fullName":"Replacement Admin"}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (160, 100000, 'create_branch', 'branch', 196, '{"code":"AMMZ7-01","name":"Main Branch","planId":1,"businessId":146}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (161, 100000, 'create_branch', 'branch', 197, '{"code":"AMMZ7-02","name":"Saddar Branch","planId":1,"businessId":146}', '2026-10-13 18:56:27');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (164, 100000, 'create_business', 'business', 152, '{"code":"NBIZ_821740","name":"New Company 821740","adminId":100244,"branchId":205}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (165, 100000, 'create_branch', 'branch', 206, '{"code":"TTB_821384-NBR_822204","name":"North Branch 822204","planId":2,"businessId":151}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (166, 100000, 'reject_subscription_payment', 'subscription_payments', 13, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (168, 100000, 'approve_subscription_payment', 'subscription_payments', 13, '{"amount":"49.00","branchId":203,"businessId":151,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (170, 100000, 'create_company_admin', 'users', 100246, '{"email":"replacement_admin_822631@test.local","businessId":151,"replacedAdminId":100242}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (171, 100000, 'delete_company_admin', 'users', 100246, '{"email":"replacement_admin_822631@test.local","fullName":"Replacement Admin"}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (172, 100000, 'create_branch', 'branch', 207, '{"code":"AMMZ2-01","name":"Main Branch","planId":1,"businessId":153}', '2026-10-13 18:57:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (173, 100000, 'create_branch', 'branch', 208, '{"code":"AMMZ2-02","name":"Saddar Branch","planId":1,"businessId":153}', '2026-10-13 18:57:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (176, 100000, 'create_business', 'business', 159, '{"code":"NBIZ_867427","name":"New Company 867427","adminId":100253,"branchId":216}', '2026-10-13 18:57:47');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (177, 100000, 'create_branch', 'branch', 217, '{"code":"TTB_867087-NBR_867881","name":"North Branch 867881","planId":2,"businessId":158}', '2026-10-13 18:57:47');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (180, 100000, 'reject_subscription_payment', 'subscription_payments', 14, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (181, 100000, 'approve_subscription_payment', 'subscription_payments', 14, '{"amount":"49.00","branchId":214,"businessId":158,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (182, 100000, 'create_company_admin', 'users', 100254, '{"email":"replacement_admin_868336@test.local","businessId":158,"replacedAdminId":100251}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (183, 100000, 'delete_company_admin', 'users', 100254, '{"email":"replacement_admin_868336@test.local","fullName":"Replacement Admin"}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (184, 100000, 'create_branch', 'branch', 218, '{"code":"AMMZ8-01","name":"Main Branch","planId":1,"businessId":160}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (185, 100000, 'create_branch', 'branch', 219, '{"code":"AMMZ8-02","name":"Saddar Branch","planId":1,"businessId":160}', '2026-10-13 18:57:48');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (188, 100000, 'create_business', 'business', 166, '{"code":"NBIZ_912621","name":"New Company 912621","adminId":100261,"branchId":227}', '2026-10-13 18:58:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (189, 100000, 'create_branch', 'branch', 228, '{"code":"TTB_912142-NBR_913115","name":"North Branch 913115","planId":2,"businessId":165}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (191, 100000, 'reject_subscription_payment', 'subscription_payments', 15, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (193, 100000, 'approve_subscription_payment', 'subscription_payments', 15, '{"amount":"49.00","branchId":225,"businessId":165,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (194, 100000, 'create_company_admin', 'users', 100262, '{"email":"replacement_admin_913575@test.local","businessId":165,"replacedAdminId":100259}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (195, 100000, 'delete_company_admin', 'users', 100262, '{"email":"replacement_admin_913575@test.local","fullName":"Replacement Admin"}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (196, 100000, 'create_branch', 'branch', 229, '{"code":"AMMZ3-01","name":"Main Branch","planId":1,"businessId":167}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (197, 100000, 'create_branch', 'branch', 231, '{"code":"AMMZ3-02","name":"Saddar Branch","planId":1,"businessId":167}', '2026-10-13 18:58:33');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (200, 100000, 'create_business', 'business', 173, '{"code":"NBIZ_024641","name":"New Company 024641","adminId":100269,"branchId":238}', '2026-10-13 19:00:24');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (201, 100000, 'create_branch', 'branch', 239, '{"code":"TTB_024101-NBR_025089","name":"North Branch 025089","planId":2,"businessId":172}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (204, 100000, 'reject_subscription_payment', 'subscription_payments', 16, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (205, 100000, 'approve_subscription_payment', 'subscription_payments', 16, '{"amount":"49.00","branchId":236,"businessId":172,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (206, 100000, 'create_company_admin', 'users', 100270, '{"email":"replacement_admin_025541@test.local","businessId":172,"replacedAdminId":100267}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (207, 100000, 'delete_company_admin', 'users', 100270, '{"email":"replacement_admin_025541@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (208, 100000, 'create_branch', 'branch', 240, '{"code":"AMMZ51-01","name":"Main Branch","planId":1,"businessId":174}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (209, 100000, 'create_branch', 'branch', 241, '{"code":"AMMZ51-02","name":"Saddar Branch","planId":1,"businessId":174}', '2026-10-13 19:00:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (212, 100000, 'create_business', 'business', 180, '{"code":"NBIZ_057024","name":"New Company 057024","adminId":100277,"branchId":249}', '2026-10-13 19:00:57');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (213, 100000, 'create_branch', 'branch', 250, '{"code":"TTB_056540-NBR_057500","name":"North Branch 057500","planId":2,"businessId":179}', '2026-10-13 19:00:57');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (215, 100000, 'reject_subscription_payment', 'subscription_payments', 17, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:00:57');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (217, 100000, 'approve_subscription_payment', 'subscription_payments', 17, '{"amount":"49.00","branchId":247,"businessId":179,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:00:57');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (218, 100000, 'create_company_admin', 'users', 100278, '{"email":"replacement_admin_058043@test.local","businessId":179,"replacedAdminId":100274}', '2026-10-13 19:00:58');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (219, 100000, 'delete_company_admin', 'users', 100278, '{"email":"replacement_admin_058043@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:00:58');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (220, 100000, 'create_branch', 'branch', 251, '{"code":"AMMZ81-01","name":"Main Branch","planId":1,"businessId":181}', '2026-10-13 19:00:58');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (221, 100000, 'create_branch', 'branch', 252, '{"code":"AMMZ81-02","name":"Saddar Branch","planId":1,"businessId":181}', '2026-10-13 19:00:58');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (224, 100000, 'create_business', 'business', 187, '{"code":"NBIZ_142139","name":"New Company 142139","adminId":100286,"branchId":260}', '2026-10-13 19:02:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (225, 100000, 'create_branch', 'branch', 261, '{"code":"TTB_141776-NBR_142796","name":"North Branch 142796","planId":2,"businessId":186}', '2026-10-13 19:02:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (227, 100000, 'reject_subscription_payment', 'subscription_payments', 18, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (229, 100000, 'approve_subscription_payment', 'subscription_payments', 18, '{"amount":"49.00","branchId":258,"businessId":186,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (230, 100000, 'create_company_admin', 'users', 100287, '{"email":"replacement_admin_143232@test.local","businessId":186,"replacedAdminId":100284}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (231, 100000, 'delete_company_admin', 'users', 100287, '{"email":"replacement_admin_143232@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (232, 100000, 'create_branch', 'branch', 262, '{"code":"AMMZ31-01","name":"Main Branch","planId":1,"businessId":188}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (233, 100000, 'create_branch', 'branch', 263, '{"code":"AMMZ31-02","name":"Saddar Branch","planId":1,"businessId":188}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (234, 100000, 'restore', 'expense', 6, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:02:23');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (237, 100000, 'create_business', 'business', 194, '{"code":"NBIZ_436529","name":"New Company 436529","adminId":100295,"branchId":271}', '2026-10-13 19:07:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (238, 100000, 'create_branch', 'branch', 272, '{"code":"TTB_436128-NBR_437100","name":"North Branch 437100","planId":2,"businessId":193}', '2026-10-13 19:07:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (241, 100000, 'reject_subscription_payment', 'subscription_payments', 19, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:07:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (242, 100000, 'approve_subscription_payment', 'subscription_payments', 19, '{"amount":"49.00","branchId":269,"businessId":193,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:07:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (243, 100000, 'create_company_admin', 'users', 100296, '{"email":"replacement_admin_437703@test.local","businessId":193,"replacedAdminId":100293}', '2026-10-13 19:07:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (244, 100000, 'delete_company_admin', 'users', 100296, '{"email":"replacement_admin_437703@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:07:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (245, 100000, 'create_branch', 'branch', 273, '{"code":"AMMZ82-01","name":"Main Branch","planId":1,"businessId":195}', '2026-10-13 19:07:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (246, 100000, 'create_branch', 'branch', 274, '{"code":"AMMZ82-02","name":"Saddar Branch","planId":1,"businessId":195}', '2026-10-13 19:07:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (247, 100000, 'restore', 'expense', 7, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:07:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (250, 100000, 'create_business', 'business', 201, '{"code":"NBIZ_422444","name":"New Company 422444","adminId":100302,"branchId":281}', '2026-10-13 19:23:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (251, 100000, 'create_branch', 'branch', 283, '{"code":"TTB_422071-NBR_422915","name":"North Branch 422915","planId":2,"businessId":200}', '2026-10-13 19:23:42');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (252, 100000, 'reject_subscription_payment', 'subscription_payments', 20, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (253, 100000, 'approve_subscription_payment', 'subscription_payments', 20, '{"amount":"49.00","branchId":280,"businessId":200,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (256, 100000, 'create_company_admin', 'users', 100304, '{"email":"replacement_admin_423412@test.local","businessId":200,"replacedAdminId":100300}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (257, 100000, 'delete_company_admin', 'users', 100304, '{"email":"replacement_admin_423412@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (258, 100000, 'create_branch', 'branch', 284, '{"code":"AMMZ32-01","name":"Main Branch","planId":1,"businessId":202}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (259, 100000, 'create_branch', 'branch', 285, '{"code":"AMMZ32-02","name":"Saddar Branch","planId":1,"businessId":202}', '2026-10-13 19:23:43');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (260, 100000, 'restore', 'expense', 8, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:23:44');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (263, 100000, 'create_business', 'business', 208, '{"code":"NBIZ_106938","name":"New Company 106938","adminId":100311,"branchId":293}', '2026-10-13 19:35:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (264, 100000, 'create_branch', 'branch', 294, '{"code":"TTB_106490-NBR_107406","name":"North Branch 107406","planId":2,"businessId":207}', '2026-10-13 19:35:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (267, 100000, 'reject_subscription_payment', 'subscription_payments', 21, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:35:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (268, 100000, 'approve_subscription_payment', 'subscription_payments', 21, '{"amount":"49.00","branchId":291,"businessId":207,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:35:07');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (269, 100000, 'create_company_admin', 'users', 100312, '{"email":"replacement_admin_107838@test.local","businessId":207,"replacedAdminId":100309}', '2026-10-13 19:35:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (270, 100000, 'delete_company_admin', 'users', 100312, '{"email":"replacement_admin_107838@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:35:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (271, 100000, 'create_branch', 'branch', 295, '{"code":"AMMZ83-01","name":"Main Branch","planId":1,"businessId":209}', '2026-10-13 19:35:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (272, 100000, 'create_branch', 'branch', 296, '{"code":"AMMZ83-02","name":"Saddar Branch","planId":1,"businessId":209}', '2026-10-13 19:35:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (273, 100000, 'restore', 'expense', 9, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:35:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (276, 100000, 'create_business', 'business', 215, '{"code":"NBIZ_523763","name":"New Company 523763","adminId":100321,"branchId":303}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (277, 100000, 'create_branch', 'branch', 305, '{"code":"TTB_523388-NBR_524212","name":"North Branch 524212","planId":2,"businessId":214}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (278, 100000, 'reject_subscription_payment', 'subscription_payments', 22, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (279, 100000, 'approve_subscription_payment', 'subscription_payments', 22, '{"amount":"49.00","branchId":302,"businessId":214,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (282, 100000, 'create_company_admin', 'users', 100323, '{"email":"replacement_admin_524647@test.local","businessId":214,"replacedAdminId":100319}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (283, 100000, 'delete_company_admin', 'users', 100323, '{"email":"replacement_admin_524647@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (284, 100000, 'create_branch', 'branch', 306, '{"code":"AMMZ4-01","name":"Main Branch","planId":1,"businessId":216}', '2026-10-13 19:42:04');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (285, 100000, 'create_branch', 'branch', 307, '{"code":"AMMZ4-02","name":"Saddar Branch","planId":1,"businessId":216}', '2026-10-13 19:42:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (286, 100000, 'restore', 'expense', 10, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:42:05');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (289, 100000, 'reject_subscription_payment', 'subscription_payments', 1, '{"reason":"not matched"}', '2026-10-13 19:46:24');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (290, 100000, 'approve_subscription_payment', 'subscription_payments', 1, '{"amount":"49.00","branchId":1,"businessId":1,"newStartDate":"2026-10-29T19:00:00.000Z","newPeriodEndsOn":"2026-11-29T19:00:00.000Z"}', '2026-10-13 19:46:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (291, 100000, 'create_business', 'business', 222, '{"code":"NBIZ_119469","name":"New Company 119469","adminId":100336,"branchId":315}', '2026-10-13 19:51:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (292, 100000, 'create_branch', 'branch', 316, '{"code":"TTB_119064-NBR_119900","name":"North Branch 119900","planId":2,"businessId":221}', '2026-10-13 19:51:59');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (294, 100000, 'reject_subscription_payment', 'subscription_payments', 23, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (296, 100000, 'approve_subscription_payment', 'subscription_payments', 23, '{"amount":"49.00","branchId":313,"businessId":221,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (297, 100000, 'create_company_admin', 'users', 100337, '{"email":"replacement_admin_120389@test.local","businessId":221,"replacedAdminId":100334}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (298, 100000, 'delete_company_admin', 'users', 100337, '{"email":"replacement_admin_120389@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (299, 100000, 'create_branch', 'branch', 317, '{"code":"AMMZ0-01","name":"Main Branch","planId":1,"businessId":223}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (300, 100000, 'create_branch', 'branch', 318, '{"code":"AMMZ0-02","name":"Saddar Branch","planId":1,"businessId":223}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (301, 100000, 'restore', 'expense', 11, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:52:00');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (304, 100000, 'create_business', 'business', 229, '{"code":"NBIZ_151102","name":"New Company 151102","adminId":100344,"branchId":326}', '2026-10-13 19:52:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (305, 100000, 'create_branch', 'branch', 327, '{"code":"TTB_150714-NBR_151558","name":"North Branch 151558","planId":2,"businessId":228}', '2026-10-13 19:52:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (307, 100000, 'reject_subscription_payment', 'subscription_payments', 24, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:52:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (309, 100000, 'approve_subscription_payment', 'subscription_payments', 24, '{"amount":"49.00","branchId":324,"businessId":228,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:52:31');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (310, 100000, 'create_company_admin', 'users', 100345, '{"email":"replacement_admin_151982@test.local","businessId":228,"replacedAdminId":100342}', '2026-10-13 19:52:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (311, 100000, 'delete_company_admin', 'users', 100345, '{"email":"replacement_admin_151982@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:52:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (312, 100000, 'create_branch', 'branch', 328, '{"code":"AMMZ21-01","name":"Main Branch","planId":1,"businessId":230}', '2026-10-13 19:52:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (313, 100000, 'create_branch', 'branch', 329, '{"code":"AMMZ21-02","name":"Saddar Branch","planId":1,"businessId":230}', '2026-10-13 19:52:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (314, 100000, 'restore', 'expense', 12, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:52:32');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (317, 100000, 'create_business', 'business', 236, '{"code":"NBIZ_308463","name":"New Company 308463","adminId":100351,"branchId":337}', '2026-10-13 19:55:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (318, 100000, 'create_branch', 'branch', 338, '{"code":"TTB_308020-NBR_308926","name":"North Branch 308926","planId":2,"businessId":235}', '2026-10-13 19:55:08');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (319, 100000, 'reject_subscription_payment', 'subscription_payments', 25, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 19:55:09');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (320, 100000, 'approve_subscription_payment', 'subscription_payments', 25, '{"amount":"49.00","branchId":335,"businessId":235,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 19:55:09');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (323, 100000, 'create_company_admin', 'users', 100353, '{"email":"replacement_admin_309628@test.local","businessId":235,"replacedAdminId":100350}', '2026-10-13 19:55:09');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (324, 100000, 'delete_company_admin', 'users', 100353, '{"email":"replacement_admin_309628@test.local","fullName":"Replacement Admin"}', '2026-10-13 19:55:09');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (325, 100000, 'create_branch', 'branch', 339, '{"code":"AMMZ9-01","name":"Main Branch","planId":1,"businessId":237}', '2026-10-13 19:55:10');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (326, 100000, 'create_branch', 'branch', 340, '{"code":"AMMZ9-02","name":"Saddar Branch","planId":1,"businessId":237}', '2026-10-13 19:55:10');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (327, 100000, 'restore', 'expense', 13, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 19:55:10');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (330, 100000, 'create_business', 'business', 243, '{"code":"NBIZ_348981","name":"New Company 348981","adminId":100360,"branchId":348}', '2026-10-13 20:12:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (331, 100000, 'create_branch', 'branch', 349, '{"code":"TTB_348582-NBR_349477","name":"North Branch 349477","planId":2,"businessId":242}', '2026-10-13 20:12:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (333, 100000, 'reject_subscription_payment', 'subscription_payments', 26, '{"reason":"Unclear deposit slip reference"}', '2026-10-13 20:12:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (335, 100000, 'approve_subscription_payment', 'subscription_payments', 26, '{"amount":"49.00","branchId":346,"businessId":242,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-13 20:12:29');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (336, 100000, 'create_company_admin', 'users', 100361, '{"email":"replacement_admin_349879@test.local","businessId":242,"replacedAdminId":100358}', '2026-10-13 20:12:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (337, 100000, 'delete_company_admin', 'users', 100361, '{"email":"replacement_admin_349879@test.local","fullName":"Replacement Admin"}', '2026-10-13 20:12:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (338, 100000, 'create_branch', 'branch', 350, '{"code":"AMMZ01-01","name":"Main Branch","planId":1,"businessId":244}', '2026-10-13 20:12:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (339, 100000, 'create_branch', 'branch', 351, '{"code":"AMMZ01-02","name":"Saddar Branch","planId":1,"businessId":244}', '2026-10-13 20:12:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (340, 100000, 'restore', 'expense', 14, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-13 20:12:30');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (343, 1, 'create_payment', 'purchase', 1, '{"amount":50000,"paymentMethod":"cash"}', '2026-10-14 05:33:06');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (344, 100000, 'create_business', 'business', 250, '{"code":"NBIZ_464938","name":"New Company 464938","adminId":100403,"branchId":359}', '2026-10-14 10:24:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (345, 100000, 'create_branch', 'branch', 360, '{"code":"TTB_464579-NBR_465380","name":"North Branch 465380","planId":2,"businessId":249}', '2026-10-14 10:24:25');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (346, 100000, 'reject_subscription_payment', 'subscription_payments', 27, '{"reason":"Unclear deposit slip reference"}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (347, 100000, 'approve_subscription_payment', 'subscription_payments', 27, '{"amount":"49.00","branchId":357,"businessId":249,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (348, 100000, 'create_company_admin', 'users', 100404, '{"email":"replacement_admin_466429@test.local","businessId":249,"replacedAdminId":100401}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (349, 100000, 'delete_company_admin', 'users', 100404, '{"email":"replacement_admin_466429@test.local","fullName":"Replacement Admin"}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (350, 100000, 'create_branch', 'branch', 363, '{"code":"AMMZ6-01","name":"Main Branch","planId":1,"businessId":252}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (351, 100000, 'create_branch', 'branch', 364, '{"code":"AMMZ6-02","name":"Saddar Branch","planId":1,"businessId":252}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (352, 100000, 'restore', 'expense', 15, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-14 10:24:26');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (353, 100000, 'create_business', 'business', 257, '{"code":"NBIZ_755964","name":"New Company 755964","adminId":100412,"branchId":370}', '2026-10-14 10:29:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (354, 100000, 'create_branch', 'branch', 371, '{"code":"TTB_755593-NBR_756782","name":"North Branch 756782","planId":2,"businessId":256}', '2026-10-14 10:29:16');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (357, 100000, 'reject_subscription_payment', 'subscription_payments', 28, '{"reason":"Unclear deposit slip reference"}', '2026-10-14 10:29:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (358, 100000, 'approve_subscription_payment', 'subscription_payments', 28, '{"amount":"49.00","branchId":368,"businessId":256,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-14 10:29:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (359, 100000, 'create_company_admin', 'users', 100414, '{"email":"replacement_admin_757729@test.local","businessId":256,"replacedAdminId":100410}', '2026-10-14 10:29:17');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (360, 100000, 'delete_company_admin', 'users', 100414, '{"email":"replacement_admin_757729@test.local","fullName":"Replacement Admin"}', '2026-10-14 10:29:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (361, 100000, 'create_branch', 'branch', 374, '{"code":"AMMZ84-01","name":"Main Branch","planId":1,"businessId":259}', '2026-10-14 10:29:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (362, 100000, 'create_branch', 'branch', 375, '{"code":"AMMZ84-02","name":"Saddar Branch","planId":1,"businessId":259}', '2026-10-14 10:29:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (363, 100000, 'restore', 'expense', 16, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-14 10:29:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (368, 100000, 'create_business', 'business', 265, '{"code":"NBIZ_981054","name":"New Company 981054","adminId":100425,"branchId":383}', '2026-10-14 10:33:01');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (369, 100000, 'create_branch', 'branch', 384, '{"code":"TTB_980087-NBR_981546","name":"North Branch 981546","planId":2,"businessId":264}', '2026-10-14 10:33:01');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (372, 100000, 'reject_subscription_payment', 'subscription_payments', 29, '{"reason":"Unclear deposit slip reference"}', '2026-10-14 10:33:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (373, 100000, 'approve_subscription_payment', 'subscription_payments', 29, '{"amount":"49.00","branchId":381,"businessId":264,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-14 10:33:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (374, 100000, 'create_company_admin', 'users', 100429, '{"email":"replacement_admin_982841@test.local","businessId":264,"replacedAdminId":100423}', '2026-10-14 10:33:02');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (375, 100000, 'delete_company_admin', 'users', 100429, '{"email":"replacement_admin_982841@test.local","fullName":"Replacement Admin"}', '2026-10-14 10:33:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (376, 100000, 'create_branch', 'branch', 387, '{"code":"AMMZ33-01","name":"Main Branch","planId":1,"businessId":267}', '2026-10-14 10:33:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (377, 100000, 'create_branch', 'branch', 388, '{"code":"AMMZ33-02","name":"Saddar Branch","planId":1,"businessId":267}', '2026-10-14 10:33:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (378, 100000, 'restore', 'expense', 17, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-14 10:33:03');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (383, 100000, 'create_business', 'business', 276, '{"code":"NBIZ_240464","name":"New Company 240464","adminId":100442,"branchId":397}', '2026-10-14 10:37:20');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (384, 100000, 'create_branch', 'branch', 400, '{"code":"TTB_240091-NBR_240837","name":"North Branch 240837","planId":2,"businessId":274}', '2026-10-14 10:37:20');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (386, 100000, 'reject_subscription_payment', 'subscription_payments', 30, '{"reason":"Unclear deposit slip reference"}', '2026-10-14 10:37:21');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (388, 100000, 'approve_subscription_payment', 'subscription_payments', 30, '{"amount":"49.00","branchId":396,"businessId":274,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-14 10:37:21');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (389, 100000, 'create_company_admin', 'users', 100445, '{"email":"replacement_admin_241907@test.local","businessId":274,"replacedAdminId":100441}', '2026-10-14 10:37:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (390, 100000, 'delete_company_admin', 'users', 100445, '{"email":"replacement_admin_241907@test.local","fullName":"Replacement Admin"}', '2026-10-14 10:37:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (391, 100000, 'create_branch', 'branch', 401, '{"code":"AMMZ22-01","name":"Main Branch","planId":1,"businessId":277}', '2026-10-14 10:37:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (392, 100000, 'create_branch', 'branch', 402, '{"code":"AMMZ22-02","name":"Saddar Branch","planId":1,"businessId":277}', '2026-10-14 10:37:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (393, 100000, 'restore', 'expense', 18, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-14 10:37:22');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (396, 100000, 'create_business', 'business', 284, '{"code":"NBIZ_417950","name":"New Company 417950","adminId":100460,"branchId":411}', '2026-10-14 17:20:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (397, 100000, 'create_branch', 'branch', 412, '{"code":"TTB_417431-NBR_418398","name":"North Branch 418398","planId":2,"businessId":282}', '2026-10-14 17:20:18');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (400, 100000, 'reject_subscription_payment', 'subscription_payments', 31, '{"reason":"Unclear deposit slip reference"}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (401, 100000, 'approve_subscription_payment', 'subscription_payments', 31, '{"amount":"49.00","branchId":408,"businessId":282,"newStartDate":"2026-12-30T19:00:00.000Z","newPeriodEndsOn":"2027-01-30T19:00:00.000Z"}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (402, 100000, 'create_company_admin', 'users', 100461, '{"email":"replacement_admin_419497@test.local","businessId":282,"replacedAdminId":100457}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (403, 100000, 'delete_company_admin', 'users', 100461, '{"email":"replacement_admin_419497@test.local","fullName":"Replacement Admin"}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (404, 100000, 'create_branch', 'branch', 413, '{"code":"AMMZ91-01","name":"Main Branch","planId":1,"businessId":285}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (405, 100000, 'create_branch', 'branch', 414, '{"code":"AMMZ91-02","name":"Saddar Branch","planId":1,"businessId":285}', '2026-10-14 17:20:19');
INSERT INTO `audit_logs` (`id`, `user_id`, `action_type`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES (406, 100000, 'restore', 'expense', 19, '{"title":"Temporary Test Expense","amount":"1500.00","restoredBy":"topadmin@mobilepos.local"}', '2026-10-14 17:20:20');

DROP TABLE IF EXISTS `branch_subscriptions`;
CREATE TABLE `branch_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `status` enum('trialing','active','grace','expired','suspended','cancelled') NOT NULL DEFAULT 'trialing',
  `subscription_starts_on` date DEFAULT NULL,
  `trial_ends_on` date DEFAULT NULL,
  `current_period_ends_on` date DEFAULT NULL,
  `grace_ends_on` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_id` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=425 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `branch_subscriptions`
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (1, 1, 1, 1, 'active', '2026-10-29 19:00:00', NULL, '2026-11-29 19:00:00', NULL, '2026-10-12 18:06:06', '2026-10-14 10:39:16');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (14, 20, 16, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:52:17', '2026-10-13 08:52:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (15, 20, 17, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 08:52:17', '2026-10-13 08:52:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (26, 23, 20, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (27, 23, 21, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (28, 26, 24, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (29, 26, 25, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (30, 29, 28, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (31, 29, 29, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (32, 32, 32, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (33, 32, 33, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:55:56', '2026-10-13 08:55:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (42, 41, 43, 1, 'suspended', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 08:58:53', '2026-10-13 11:53:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (43, 41, 44, 1, 'active', NULL, NULL, '2026-10-29 19:00:00', NULL, '2026-10-13 08:58:54', '2026-10-13 11:54:08');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (67, 49, 55, 1, 'suspended', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 11:47:31', '2026-10-13 11:52:56');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (68, 49, 56, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 11:47:31', '2026-10-13 11:47:31');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (94, 85, 109, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 14:36:33', '2026-10-13 14:36:35');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (96, 86, 111, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:36:34', '2026-10-13 14:36:34');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (97, 85, 112, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:36:34', '2026-10-13 14:36:34');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (101, 91, 118, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 14:49:42', '2026-10-13 14:49:43');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (103, 92, 120, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:49:42', '2026-10-13 14:49:42');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (104, 91, 121, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:49:42', '2026-10-13 14:49:42');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (109, 97, 127, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 14:54:58', '2026-10-13 14:55:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (111, 98, 129, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:54:59', '2026-10-13 14:54:59');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (112, 97, 130, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 14:54:59', '2026-10-13 14:54:59');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (113, 96, 126, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 14:55:00', '2026-10-13 14:55:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (114, 96, 128, 1, 'active', NULL, NULL, '2099-12-30 19:00:00', NULL, '2026-10-13 14:55:00', '2026-10-13 14:55:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (122, 103, 136, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:25:36', '2026-10-13 15:25:37');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (124, 104, 138, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:25:36', '2026-10-13 15:25:36');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (125, 103, 139, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:25:36', '2026-10-13 15:25:36');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (131, 109, 145, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:37:17', '2026-10-13 15:37:19');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (134, 110, 147, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:37:18', '2026-10-13 15:37:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (135, 109, 148, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:37:18', '2026-10-13 15:37:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (141, 115, 154, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:42:15', '2026-10-13 15:42:16');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (145, 118, 158, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:43:03', '2026-10-13 15:43:03');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (146, 120, 159, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:43:26', '2026-10-13 15:43:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (150, 124, 163, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:45:43', '2026-10-13 15:45:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (152, 125, 165, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:45:44', '2026-10-13 15:45:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (153, 124, 166, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:45:44', '2026-10-13 15:45:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (157, 130, 172, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:46:40', '2026-10-13 15:46:41');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (159, 131, 174, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:46:40', '2026-10-13 15:46:40');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (160, 130, 175, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:46:40', '2026-10-13 15:46:40');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (164, 137, 181, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 15:47:43', '2026-10-13 15:47:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (166, 138, 183, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:47:44', '2026-10-13 15:47:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (167, 137, 184, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:47:44', '2026-10-13 15:47:44');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (168, 139, 185, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:47:45', '2026-10-13 15:47:45');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (169, 139, 186, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 15:47:45', '2026-10-13 15:47:45');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (185, 144, 192, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 18:56:26', '2026-10-13 18:56:27');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (187, 145, 194, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:56:26', '2026-10-13 18:56:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (188, 144, 195, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:56:26', '2026-10-13 18:56:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (189, 146, 196, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:56:27', '2026-10-13 18:56:27');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (190, 146, 197, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:56:27', '2026-10-13 18:56:27');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (194, 151, 203, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 18:57:01', '2026-10-13 18:57:02');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (196, 152, 205, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:02', '2026-10-13 18:57:02');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (197, 151, 206, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:02', '2026-10-13 18:57:02');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (198, 153, 207, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:02', '2026-10-13 18:57:02');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (199, 153, 208, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:03', '2026-10-13 18:57:03');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (203, 158, 214, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 18:57:47', '2026-10-13 18:57:48');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (205, 159, 216, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:47', '2026-10-13 18:57:47');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (206, 158, 217, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:47', '2026-10-13 18:57:47');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (207, 160, 218, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:48', '2026-10-13 18:57:48');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (208, 160, 219, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:57:48', '2026-10-13 18:57:48');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (212, 165, 225, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 18:58:32', '2026-10-13 18:58:33');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (214, 166, 227, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:58:32', '2026-10-13 18:58:32');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (215, 165, 228, 2, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:58:33', '2026-10-13 18:58:33');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (216, 167, 229, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:58:33', '2026-10-13 18:58:33');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (217, 167, 231, 1, 'trialing', NULL, '2026-10-26 19:00:00', NULL, '2026-11-02 19:00:00', '2026-10-13 18:58:33', '2026-10-13 18:58:33');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (221, 172, 236, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:00:24', '2026-10-13 19:00:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (223, 173, 238, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:24', '2026-10-13 19:00:24');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (224, 172, 239, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:25', '2026-10-13 19:00:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (225, 174, 240, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:25', '2026-10-13 19:00:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (226, 174, 241, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:25', '2026-10-13 19:00:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (230, 179, 247, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:00:56', '2026-10-13 19:00:57');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (232, 180, 249, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:57', '2026-10-13 19:00:57');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (233, 179, 250, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:57', '2026-10-13 19:00:57');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (234, 181, 251, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:58', '2026-10-13 19:00:58');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (235, 181, 252, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:00:58', '2026-10-13 19:00:58');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (240, 186, 258, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:02:21', '2026-10-13 19:02:23');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (242, 187, 260, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:02:22', '2026-10-13 19:02:22');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (243, 186, 261, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:02:22', '2026-10-13 19:02:22');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (244, 188, 262, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:02:23', '2026-10-13 19:02:23');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (245, 188, 263, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:02:23', '2026-10-13 19:02:23');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (250, 193, 269, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:07:16', '2026-10-13 19:07:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (252, 194, 271, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:07:16', '2026-10-13 19:07:16');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (253, 193, 272, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:07:17', '2026-10-13 19:07:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (254, 195, 273, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:07:18', '2026-10-13 19:07:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (255, 195, 274, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:07:18', '2026-10-13 19:07:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (259, 200, 280, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:23:42', '2026-10-13 19:23:43');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (261, 201, 281, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:23:42', '2026-10-13 19:23:42');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (262, 200, 283, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:23:42', '2026-10-13 19:23:42');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (263, 202, 284, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:23:43', '2026-10-13 19:23:43');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (264, 202, 285, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:23:43', '2026-10-13 19:23:43');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (268, 207, 291, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:35:06', '2026-10-13 19:35:07');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (270, 208, 293, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:35:07', '2026-10-13 19:35:07');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (271, 207, 294, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:35:07', '2026-10-13 19:35:07');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (272, 209, 295, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:35:08', '2026-10-13 19:35:08');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (273, 209, 296, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:35:08', '2026-10-13 19:35:08');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (280, 214, 302, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:42:03', '2026-10-13 19:42:04');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (282, 215, 303, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:42:04', '2026-10-13 19:42:04');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (283, 214, 305, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:42:04', '2026-10-13 19:42:04');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (284, 216, 306, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:42:04', '2026-10-13 19:42:04');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (285, 216, 307, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:42:05', '2026-10-13 19:42:05');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (295, 221, 313, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:51:59', '2026-10-13 19:52:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (297, 222, 315, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:51:59', '2026-10-13 19:51:59');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (298, 221, 316, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:51:59', '2026-10-13 19:51:59');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (299, 223, 317, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:00', '2026-10-13 19:52:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (300, 223, 318, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:00', '2026-10-13 19:52:00');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (304, 228, 324, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:52:30', '2026-10-13 19:52:31');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (306, 229, 326, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:31', '2026-10-13 19:52:31');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (307, 228, 327, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:31', '2026-10-13 19:52:31');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (308, 230, 328, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:32', '2026-10-13 19:52:32');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (309, 230, 329, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:52:32', '2026-10-13 19:52:32');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (313, 235, 335, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 19:55:08', '2026-10-13 19:55:09');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (315, 236, 337, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:55:08', '2026-10-13 19:55:08');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (316, 235, 338, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:55:08', '2026-10-13 19:55:08');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (317, 237, 339, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:55:10', '2026-10-13 19:55:10');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (318, 237, 340, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 19:55:10', '2026-10-13 19:55:10');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (322, 242, 346, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-13 20:12:28', '2026-10-13 20:12:29');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (324, 243, 348, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 20:12:29', '2026-10-13 20:12:29');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (325, 242, 349, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 20:12:29', '2026-10-13 20:12:29');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (326, 244, 350, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 20:12:30', '2026-10-13 20:12:30');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (327, 244, 351, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-13 20:12:30', '2026-10-13 20:12:30');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (367, 249, 357, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-14 10:24:24', '2026-10-14 10:24:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (369, 250, 359, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (370, 249, 360, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (373, 252, 363, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (374, 252, 364, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (377, 256, 368, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-14 10:29:15', '2026-10-14 10:29:17');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (379, 257, 370, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:29:16', '2026-10-14 10:29:16');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (380, 256, 371, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:29:16', '2026-10-14 10:29:16');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (383, 259, 374, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:29:18', '2026-10-14 10:29:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (384, 259, 375, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:29:18', '2026-10-14 10:29:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (389, 264, 381, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-14 10:33:00', '2026-10-14 10:33:02');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (391, 265, 383, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (392, 264, 384, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (395, 267, 387, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:33:03', '2026-10-14 10:33:03');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (396, 267, 388, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:33:03', '2026-10-14 10:33:03');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (402, 274, 396, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-14 10:37:20', '2026-10-14 10:37:21');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (405, 276, 397, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:37:20', '2026-10-14 10:37:20');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (406, 274, 400, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:37:20', '2026-10-14 10:37:20');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (407, 277, 401, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:37:22', '2026-10-14 10:37:22');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (408, 277, 402, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 10:37:22', '2026-10-14 10:37:22');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (417, 282, 408, 2, 'active', '2026-12-30 19:00:00', NULL, '2027-01-30 19:00:00', NULL, '2026-10-14 17:20:17', '2026-10-14 17:20:19');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (420, 284, 411, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (421, 282, 412, 2, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (422, 285, 413, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 17:20:19', '2026-10-14 17:20:19');
INSERT INTO `branch_subscriptions` (`id`, `business_id`, `branch_id`, `plan_id`, `status`, `subscription_starts_on`, `trial_ends_on`, `current_period_ends_on`, `grace_ends_on`, `created_at`, `updated_at`) VALUES (423, 285, 414, 1, 'trialing', NULL, '2026-10-27 19:00:00', NULL, '2026-11-03 19:00:00', '2026-10-14 17:20:19', '2026-10-14 17:20:19');

DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL DEFAULT '1',
  `name` varchar(120) NOT NULL,
  `code` varchar(60) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=415 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `branches`
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (1, 1, 'Main Branch', 'MAIN', 'Main Market', 1, '2026-04-21 11:24:49');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (16, 20, 'Main Branch', 'BR1_537032', NULL, 1, '2026-10-13 08:52:17');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (17, 20, 'Gulberg Branch', 'GUL_7409', 'Main Boulevard Gulberg', 1, '2026-10-13 08:52:17');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (20, 23, 'Main Branch', 'BR1_586181', NULL, 1, '2026-10-13 08:53:06');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (21, 23, 'Gulberg Branch', 'GUL_6592', 'Main Boulevard Gulberg', 1, '2026-10-13 08:53:06');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (24, 26, 'Main Branch', 'BR1_607849', NULL, 1, '2026-10-13 08:53:28');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (25, 26, 'Gulberg Branch', 'GUL_8530', 'Main Boulevard Gulberg', 1, '2026-10-13 08:53:28');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (28, 29, 'Main Branch', 'BR1_632882', NULL, 1, '2026-10-13 08:53:52');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (29, 29, 'Gulberg Branch', 'GUL_3390', 'Main Boulevard Gulberg', 1, '2026-10-13 08:53:53');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (32, 32, 'Main Branch', 'BR1_673796', NULL, 1, '2026-10-13 08:54:33');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (33, 32, 'Gulberg Branch', 'GUL_4156', 'Main Boulevard Gulberg', 1, '2026-10-13 08:54:34');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (43, 41, 'Branch Alpha', 'TRA_933793', NULL, 1, '2026-10-13 08:58:53');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (44, 41, 'Branch Beta', 'TRB2_933793', NULL, 1, '2026-10-13 08:58:53');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (55, 49, 'Branch Alpha', 'TRA_350346', NULL, 1, '2026-10-13 09:05:50');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (56, 49, 'Branch Beta', 'TRB2_350346', NULL, 1, '2026-10-13 09:05:50');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (109, 85, 'Branch Alpha', 'TBA_193731', NULL, 1, '2026-10-13 14:36:33');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (111, 86, 'Headquarters', 'HQ_194135', NULL, 1, '2026-10-13 14:36:34');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (112, 85, 'North Branch Renamed 194609', 'NBR_194609', 'Updated Address 123', 1, '2026-10-13 14:36:34');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (118, 91, 'Branch Alpha', 'TBA_981998', NULL, 1, '2026-10-13 14:49:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (120, 92, 'Headquarters', 'HQ_982554', NULL, 1, '2026-10-13 14:49:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (121, 91, 'North Branch Renamed 982954', 'NBR_982954', 'Updated Address 123', 1, '2026-10-13 14:49:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (127, 97, 'Branch Alpha', 'TBA_298732', NULL, 1, '2026-10-13 14:54:58');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (129, 98, 'Headquarters', 'HQ_299101', NULL, 1, '2026-10-13 14:54:59');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (130, 97, 'North Branch Renamed 299642', 'NBR_299642', 'Updated Address 123', 1, '2026-10-13 14:54:59');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (136, 103, 'Branch Alpha', 'TBA_136000', NULL, 1, '2026-10-13 15:25:36');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (138, 104, 'Headquarters', 'HQ_136349', NULL, 1, '2026-10-13 15:25:36');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (139, 103, 'North Branch Renamed 136821', 'NBR_136821', 'Updated Address 123', 1, '2026-10-13 15:25:36');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (145, 109, 'Branch Alpha', 'TBA_837727', NULL, 1, '2026-10-13 15:37:17');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (147, 110, 'Headquarters', 'HQ_838172', NULL, 1, '2026-10-13 15:37:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (148, 109, 'North Branch Renamed 838694', 'NBR_838694', 'Updated Address 123', 1, '2026-10-13 15:37:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (154, 115, 'Branch Alpha', 'TBA_135360', NULL, 1, '2026-10-13 15:42:15');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (158, 118, 'Branch Alpha', 'TBA_183144', NULL, 1, '2026-10-13 15:43:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (159, 120, 'HQ', 'NCO_99-HQ_99', NULL, 1, '2026-10-13 15:43:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (163, 124, 'Branch Alpha', 'TBA_343443', NULL, 1, '2026-10-13 15:45:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (165, 125, 'Headquarters', 'NBIZ_343906-HQ_343906', NULL, 1, '2026-10-13 15:45:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (166, 124, 'North Branch Renamed 344353', 'TTB_343443-NBR_344353', 'Updated Address 123', 1, '2026-10-13 15:45:44');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (172, 130, 'Branch Alpha', 'TBA_399833', NULL, 1, '2026-10-13 15:46:39');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (174, 131, 'Headquarters', 'NBIZ_400298-HQ_400298', NULL, 1, '2026-10-13 15:46:40');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (175, 130, 'North Branch Renamed 400745', 'TTB_399833-NBR_400745', 'Updated Address 123', 1, '2026-10-13 15:46:40');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (181, 137, 'Branch Alpha', 'TBA_463563', NULL, 1, '2026-10-13 15:47:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (183, 138, 'Headquarters', 'NBIZ_463908-HQ_463908', NULL, 1, '2026-10-13 15:47:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (184, 137, 'North Branch Renamed 464366', 'TTB_463563-NBR_464366', 'Updated Address 123', 1, '2026-10-13 15:47:44');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (185, 139, 'Main Branch', 'AMMZ5-01', NULL, 1, '2026-10-13 15:47:45');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (186, 139, 'Saddar Branch', 'AMMZ5-02', NULL, 1, '2026-10-13 15:47:45');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (192, 144, 'Branch Alpha', 'TBA_785947', NULL, 1, '2026-10-13 18:56:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (194, 145, 'Headquarters', 'NBIZ_786377-HQ_786377', NULL, 1, '2026-10-13 18:56:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (195, 144, 'North Branch Renamed 786854', 'TTB_785947-NBR_786854', 'Updated Address 123', 1, '2026-10-13 18:56:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (196, 146, 'Main Branch', 'AMMZ7-01', NULL, 1, '2026-10-13 18:56:27');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (197, 146, 'Saddar Branch', 'AMMZ7-02', NULL, 1, '2026-10-13 18:56:27');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (203, 151, 'Branch Alpha', 'TBA_821384', NULL, 1, '2026-10-13 18:57:01');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (205, 152, 'Headquarters', 'NBIZ_821740-HQ_821740', NULL, 1, '2026-10-13 18:57:01');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (206, 151, 'North Branch Renamed 822204', 'TTB_821384-NBR_822204', 'Updated Address 123', 1, '2026-10-13 18:57:02');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (207, 153, 'Main Branch', 'AMMZ2-01', NULL, 1, '2026-10-13 18:57:02');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (208, 153, 'Saddar Branch', 'AMMZ2-02', NULL, 1, '2026-10-13 18:57:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (214, 158, 'Branch Alpha', 'TBA_867087', NULL, 1, '2026-10-13 18:57:47');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (216, 159, 'Headquarters', 'NBIZ_867427-HQ_867427', NULL, 1, '2026-10-13 18:57:47');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (217, 158, 'North Branch Renamed 867881', 'TTB_867087-NBR_867881', 'Updated Address 123', 1, '2026-10-13 18:57:47');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (218, 160, 'Main Branch', 'AMMZ8-01', NULL, 1, '2026-10-13 18:57:48');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (219, 160, 'Saddar Branch', 'AMMZ8-02', NULL, 1, '2026-10-13 18:57:48');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (225, 165, 'Branch Alpha', 'TBA_912142', NULL, 1, '2026-10-13 18:58:32');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (227, 166, 'Headquarters', 'NBIZ_912621-HQ_912621', NULL, 1, '2026-10-13 18:58:32');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (228, 165, 'North Branch Renamed 913115', 'TTB_912142-NBR_913115', 'Updated Address 123', 1, '2026-10-13 18:58:33');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (229, 167, 'Main Branch', 'AMMZ3-01', NULL, 1, '2026-10-13 18:58:33');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (231, 167, 'Saddar Branch', 'AMMZ3-02', NULL, 1, '2026-10-13 18:58:33');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (236, 172, 'Branch Alpha', 'TBA_024101', NULL, 1, '2026-10-13 19:00:24');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (238, 173, 'Headquarters', 'NBIZ_024641-HQ_024641', NULL, 1, '2026-10-13 19:00:24');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (239, 172, 'North Branch Renamed 025089', 'TTB_024101-NBR_025089', 'Updated Address 123', 1, '2026-10-13 19:00:25');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (240, 174, 'Main Branch', 'AMMZ51-01', NULL, 1, '2026-10-13 19:00:25');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (241, 174, 'Saddar Branch', 'AMMZ51-02', NULL, 1, '2026-10-13 19:00:25');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (247, 179, 'Branch Alpha', 'TBA_056540', NULL, 1, '2026-10-13 19:00:56');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (249, 180, 'Headquarters', 'NBIZ_057024-HQ_057024', NULL, 1, '2026-10-13 19:00:57');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (250, 179, 'North Branch Renamed 057500', 'TTB_056540-NBR_057500', 'Updated Address 123', 1, '2026-10-13 19:00:57');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (251, 181, 'Main Branch', 'AMMZ81-01', NULL, 1, '2026-10-13 19:00:58');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (252, 181, 'Saddar Branch', 'AMMZ81-02', NULL, 1, '2026-10-13 19:00:58');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (258, 186, 'Branch Alpha', 'TBA_141776', NULL, 1, '2026-10-13 19:02:21');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (260, 187, 'Headquarters', 'NBIZ_142139-HQ_142139', NULL, 1, '2026-10-13 19:02:22');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (261, 186, 'North Branch Renamed 142796', 'TTB_141776-NBR_142796', 'Updated Address 123', 1, '2026-10-13 19:02:22');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (262, 188, 'Main Branch', 'AMMZ31-01', NULL, 1, '2026-10-13 19:02:23');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (263, 188, 'Saddar Branch', 'AMMZ31-02', NULL, 1, '2026-10-13 19:02:23');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (269, 193, 'Branch Alpha', 'TBA_436128', NULL, 1, '2026-10-13 19:07:16');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (271, 194, 'Headquarters', 'NBIZ_436529-HQ_436529', NULL, 1, '2026-10-13 19:07:16');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (272, 193, 'North Branch Renamed 437100', 'TTB_436128-NBR_437100', 'Updated Address 123', 1, '2026-10-13 19:07:17');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (273, 195, 'Main Branch', 'AMMZ82-01', NULL, 1, '2026-10-13 19:07:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (274, 195, 'Saddar Branch', 'AMMZ82-02', NULL, 1, '2026-10-13 19:07:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (280, 200, 'Branch Alpha', 'TBA_422071', NULL, 1, '2026-10-13 19:23:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (281, 201, 'Headquarters', 'NBIZ_422444-HQ_422444', NULL, 1, '2026-10-13 19:23:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (283, 200, 'North Branch Renamed 422915', 'TTB_422071-NBR_422915', 'Updated Address 123', 1, '2026-10-13 19:23:42');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (284, 202, 'Main Branch', 'AMMZ32-01', NULL, 1, '2026-10-13 19:23:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (285, 202, 'Saddar Branch', 'AMMZ32-02', NULL, 1, '2026-10-13 19:23:43');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (291, 207, 'Branch Alpha', 'TBA_106490', NULL, 1, '2026-10-13 19:35:06');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (293, 208, 'Headquarters', 'NBIZ_106938-HQ_106938', NULL, 1, '2026-10-13 19:35:07');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (294, 207, 'North Branch Renamed 107406', 'TTB_106490-NBR_107406', 'Updated Address 123', 1, '2026-10-13 19:35:07');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (295, 209, 'Main Branch', 'AMMZ83-01', NULL, 1, '2026-10-13 19:35:08');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (296, 209, 'Saddar Branch', 'AMMZ83-02', NULL, 1, '2026-10-13 19:35:08');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (302, 214, 'Branch Alpha', 'TBA_523388', NULL, 1, '2026-10-13 19:42:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (303, 215, 'Headquarters', 'NBIZ_523763-HQ_523763', NULL, 1, '2026-10-13 19:42:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (305, 214, 'North Branch Renamed 524212', 'TTB_523388-NBR_524212', 'Updated Address 123', 1, '2026-10-13 19:42:04');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (306, 216, 'Main Branch', 'AMMZ4-01', NULL, 1, '2026-10-13 19:42:04');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (307, 216, 'Saddar Branch', 'AMMZ4-02', NULL, 1, '2026-10-13 19:42:05');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (313, 221, 'Branch Alpha', 'TBA_119064', NULL, 1, '2026-10-13 19:51:59');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (315, 222, 'Headquarters', 'NBIZ_119469-HQ_119469', NULL, 1, '2026-10-13 19:51:59');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (316, 221, 'North Branch Renamed 119900', 'TTB_119064-NBR_119900', 'Updated Address 123', 1, '2026-10-13 19:51:59');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (317, 223, 'Main Branch', 'AMMZ0-01', NULL, 1, '2026-10-13 19:52:00');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (318, 223, 'Saddar Branch', 'AMMZ0-02', NULL, 1, '2026-10-13 19:52:00');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (324, 228, 'Branch Alpha', 'TBA_150714', NULL, 1, '2026-10-13 19:52:30');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (326, 229, 'Headquarters', 'NBIZ_151102-HQ_151102', NULL, 1, '2026-10-13 19:52:31');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (327, 228, 'North Branch Renamed 151558', 'TTB_150714-NBR_151558', 'Updated Address 123', 1, '2026-10-13 19:52:31');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (328, 230, 'Main Branch', 'AMMZ21-01', NULL, 1, '2026-10-13 19:52:32');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (329, 230, 'Saddar Branch', 'AMMZ21-02', NULL, 1, '2026-10-13 19:52:32');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (335, 235, 'Branch Alpha', 'TBA_308020', NULL, 1, '2026-10-13 19:55:08');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (337, 236, 'Headquarters', 'NBIZ_308463-HQ_308463', NULL, 1, '2026-10-13 19:55:08');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (338, 235, 'North Branch Renamed 308926', 'TTB_308020-NBR_308926', 'Updated Address 123', 1, '2026-10-13 19:55:08');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (339, 237, 'Main Branch', 'AMMZ9-01', NULL, 1, '2026-10-13 19:55:10');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (340, 237, 'Saddar Branch', 'AMMZ9-02', NULL, 1, '2026-10-13 19:55:10');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (346, 242, 'Branch Alpha', 'TBA_348582', NULL, 1, '2026-10-13 20:12:28');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (348, 243, 'Headquarters', 'NBIZ_348981-HQ_348981', NULL, 1, '2026-10-13 20:12:29');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (349, 242, 'North Branch Renamed 349477', 'TTB_348582-NBR_349477', 'Updated Address 123', 1, '2026-10-13 20:12:29');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (350, 244, 'Main Branch', 'AMMZ01-01', NULL, 1, '2026-10-13 20:12:30');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (351, 244, 'Saddar Branch', 'AMMZ01-02', NULL, 1, '2026-10-13 20:12:30');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (357, 249, 'Branch Alpha', 'TBA_464579', NULL, 1, '2026-10-14 10:24:24');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (359, 250, 'Headquarters', 'NBIZ_464938-HQ_464938', NULL, 1, '2026-10-14 10:24:24');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (360, 249, 'North Branch Renamed 465380', 'TTB_464579-NBR_465380', 'Updated Address 123', 1, '2026-10-14 10:24:25');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (363, 252, 'Main Branch', 'AMMZ6-01', NULL, 1, '2026-10-14 10:24:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (364, 252, 'Saddar Branch', 'AMMZ6-02', NULL, 1, '2026-10-14 10:24:26');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (368, 256, 'Branch Alpha', 'TBA_755593', NULL, 1, '2026-10-14 10:29:15');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (370, 257, 'Headquarters', 'NBIZ_755964-HQ_755964', NULL, 1, '2026-10-14 10:29:16');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (371, 256, 'North Branch Renamed 756782', 'TTB_755593-NBR_756782', 'Updated Address 123', 1, '2026-10-14 10:29:16');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (374, 259, 'Main Branch', 'AMMZ84-01', NULL, 1, '2026-10-14 10:29:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (375, 259, 'Saddar Branch', 'AMMZ84-02', NULL, 1, '2026-10-14 10:29:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (381, 264, 'Branch Alpha', 'TBA_980087', NULL, 1, '2026-10-14 10:33:00');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (383, 265, 'Headquarters', 'NBIZ_981054-HQ_981054', NULL, 1, '2026-10-14 10:33:01');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (384, 264, 'North Branch Renamed 981546', 'TTB_980087-NBR_981546', 'Updated Address 123', 1, '2026-10-14 10:33:01');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (387, 267, 'Main Branch', 'AMMZ33-01', NULL, 1, '2026-10-14 10:33:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (388, 267, 'Saddar Branch', 'AMMZ33-02', NULL, 1, '2026-10-14 10:33:03');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (396, 274, 'Branch Alpha', 'TBA_240091', NULL, 1, '2026-10-14 10:37:20');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (397, 276, 'Headquarters', 'NBIZ_240464-HQ_240464', NULL, 1, '2026-10-14 10:37:20');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (400, 274, 'North Branch Renamed 240837', 'TTB_240091-NBR_240837', 'Updated Address 123', 1, '2026-10-14 10:37:20');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (401, 277, 'Main Branch', 'AMMZ22-01', NULL, 1, '2026-10-14 10:37:22');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (402, 277, 'Saddar Branch', 'AMMZ22-02', NULL, 1, '2026-10-14 10:37:22');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (408, 282, 'Branch Alpha', 'TBA_417431', NULL, 1, '2026-10-14 17:20:17');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (411, 284, 'Headquarters', 'NBIZ_417950-HQ_417950', NULL, 1, '2026-10-14 17:20:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (412, 282, 'North Branch Renamed 418398', 'TTB_417431-NBR_418398', 'Updated Address 123', 1, '2026-10-14 17:20:18');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (413, 285, 'Main Branch', 'AMMZ91-01', NULL, 1, '2026-10-14 17:20:19');
INSERT INTO `branches` (`id`, `business_id`, `name`, `code`, `address`, `is_active`, `created_at`) VALUES (414, 285, 'Saddar Branch', 'AMMZ91-02', NULL, 1, '2026-10-14 17:20:19');

DROP TABLE IF EXISTS `business_role_permissions`;
CREATE TABLE `business_role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `page_key` varchar(50) NOT NULL,
  `action_key` varchar(50) NOT NULL,
  `is_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_biz_role_perm` (`business_id`,`role_name`,`page_key`,`action_key`),
  CONSTRAINT `business_role_permissions_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `businesses`;
CREATE TABLE `businesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `code` varchar(60) NOT NULL,
  `email` varchar(120) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=286 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `businesses`
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (1, 'Demo Mobile Shop', 'DEMO', NULL, NULL, NULL, 1, '2026-10-08 08:45:53');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (2, 'Alpha Cellular', 'ALPHA_1791880067228', NULL, NULL, NULL, 0, '2026-10-13 08:27:47');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (3, 'Beta Electronics', 'BETA_1791880067228', NULL, NULL, NULL, 1, '2026-10-13 08:27:47');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (4, 'Alpha Cellular', 'ALPHA_1791880087706', NULL, NULL, NULL, 0, '2026-10-13 08:28:07');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (5, 'Beta Electronics', 'BETA_1791880087706', NULL, NULL, NULL, 1, '2026-10-13 08:28:07');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (6, 'Alpha Cellular', 'ALPHA_1791880147141', NULL, NULL, NULL, 1, '2026-10-13 08:29:07');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (7, 'Beta Electronics', 'BETA_1791880147141', NULL, NULL, NULL, 1, '2026-10-13 08:29:07');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (20, 'Test Catalog Biz 537032', 'TCB_537032', NULL, NULL, NULL, 1, '2026-10-13 08:52:17');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (23, 'Test Catalog Biz 586181', 'TCB_586181', NULL, NULL, NULL, 1, '2026-10-13 08:53:06');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (26, 'Test Catalog Biz 607849', 'TCB_607849', NULL, NULL, NULL, 1, '2026-10-13 08:53:28');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (29, 'Test Catalog Biz 632882', 'TCB_632882', NULL, NULL, NULL, 1, '2026-10-13 08:53:52');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (32, 'Test Catalog Biz 673796', 'TCB_673796', NULL, NULL, NULL, 1, '2026-10-13 08:54:33');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (41, 'Transfer Biz 933793', 'TRB_933793', NULL, NULL, NULL, 1, '2026-10-13 08:58:53');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (49, 'Transfer Biz 350346', 'TRB_350346', NULL, NULL, NULL, 1, '2026-10-13 09:05:50');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (85, 'Tenant Test Biz 193731', 'TTB_193731', NULL, NULL, NULL, 1, '2026-10-13 14:36:33');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (86, 'Updated Company 194135', 'NBIZ_194135', 'contact_194135@company.com', '+9876543210', NULL, 0, '2026-10-13 14:36:34');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (91, 'Tenant Test Biz 981998', 'TTB_981998', NULL, NULL, NULL, 1, '2026-10-13 14:49:42');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (92, 'Updated Company 982554', 'NBIZ_982554', 'contact_982554@company.com', '+9876543210', NULL, 0, '2026-10-13 14:49:42');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (97, 'Tenant Test Biz 298732', 'TTB_298732', NULL, NULL, NULL, 1, '2026-10-13 14:54:58');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (98, 'Updated Company 299101', 'NBIZ_299101', 'contact_299101@company.com', '+9876543210', NULL, 0, '2026-10-13 14:54:59');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (103, 'Tenant Test Biz 136000', 'TTB_136000', NULL, NULL, NULL, 1, '2026-10-13 15:25:36');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (104, 'Updated Company 136349', 'NBIZ_136349', 'contact_136349@company.com', '+9876543210', NULL, 0, '2026-10-13 15:25:36');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (109, 'Tenant Test Biz 837727', 'TTB_837727', NULL, NULL, NULL, 1, '2026-10-13 15:37:17');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (110, 'Updated Company 838172', 'NBIZ_838172', 'contact_838172@company.com', '+9876543210', NULL, 0, '2026-10-13 15:37:18');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (115, 'Tenant Test Biz 135360', 'TTB_135360', NULL, NULL, NULL, 1, '2026-10-13 15:42:15');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (118, 'Tenant Test Biz 183144', 'TTB_183144', NULL, NULL, NULL, 1, '2026-10-13 15:43:03');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (120, 'New Co', 'NCO_99', NULL, NULL, NULL, 0, '2026-10-13 15:43:26');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (124, 'Tenant Test Biz 343443', 'TTB_343443', NULL, NULL, NULL, 1, '2026-10-13 15:45:43');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (125, 'Updated Company 343906', 'NBIZ_343906', 'contact_343906@company.com', '+9876543210', NULL, 0, '2026-10-13 15:45:43');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (130, 'Tenant Test Biz 399833', 'TTB_399833', NULL, NULL, NULL, 1, '2026-10-13 15:46:39');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (131, 'Updated Company 400298', 'NBIZ_400298', 'contact_400298@company.com', '+9876543210', NULL, 0, '2026-10-13 15:46:40');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (132, 'Al Madina Mobile Zone 1474', 'AMMZ1', 'auto_1474@madina.com', NULL, NULL, 0, '2026-10-13 15:46:41');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (137, 'Tenant Test Biz 463563', 'TTB_463563', NULL, NULL, NULL, 1, '2026-10-13 15:47:43');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (138, 'Updated Company 463908', 'NBIZ_463908', 'contact_463908@company.com', '+9876543210', NULL, 0, '2026-10-13 15:47:43');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (139, 'Al Madina Mobile Zone 5073', 'AMMZ5', 'auto_5073@madina.com', NULL, NULL, 1, '2026-10-13 15:47:45');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (144, 'Tenant Test Biz 785947', 'TTB_785947', NULL, NULL, NULL, 1, '2026-10-13 18:56:25');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (145, 'Updated Company 786377', 'NBIZ_786377', 'contact_786377@company.com', '+9876543210', NULL, 0, '2026-10-13 18:56:26');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (146, 'Al Madina Mobile Zone 7763', 'AMMZ7', 'auto_7763@madina.com', NULL, NULL, 1, '2026-10-13 18:56:27');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (151, 'Tenant Test Biz 821384', 'TTB_821384', NULL, NULL, NULL, 1, '2026-10-13 18:57:01');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (152, 'Updated Company 821740', 'NBIZ_821740', 'contact_821740@company.com', '+9876543210', NULL, 0, '2026-10-13 18:57:01');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (153, 'Al Madina Mobile Zone 2885', 'AMMZ2', 'auto_2885@madina.com', NULL, NULL, 1, '2026-10-13 18:57:02');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (158, 'Tenant Test Biz 867087', 'TTB_867087', NULL, NULL, NULL, 1, '2026-10-13 18:57:47');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (159, 'Updated Company 867427', 'NBIZ_867427', 'contact_867427@company.com', '+9876543210', NULL, 0, '2026-10-13 18:57:47');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (160, 'Al Madina Mobile Zone 8638', 'AMMZ8', 'auto_8638@madina.com', NULL, NULL, 1, '2026-10-13 18:57:48');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (165, 'Tenant Test Biz 912142', 'TTB_912142', NULL, NULL, NULL, 1, '2026-10-13 18:58:32');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (166, 'Updated Company 912621', 'NBIZ_912621', 'contact_912621@company.com', '+9876543210', NULL, 0, '2026-10-13 18:58:32');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (167, 'Al Madina Mobile Zone 3848', 'AMMZ3', 'auto_3848@madina.com', NULL, NULL, 1, '2026-10-13 18:58:33');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (172, 'Tenant Test Biz 024101', 'TTB_024101', NULL, NULL, NULL, 1, '2026-10-13 19:00:24');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (173, 'Updated Company 024641', 'NBIZ_024641', 'contact_024641@company.com', '+9876543210', NULL, 0, '2026-10-13 19:00:24');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (174, 'Al Madina Mobile Zone 5830', 'AMMZ51', 'auto_5830@madina.com', NULL, NULL, 1, '2026-10-13 19:00:25');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (179, 'Tenant Test Biz 056540', 'TTB_056540', NULL, NULL, NULL, 1, '2026-10-13 19:00:56');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (180, 'Updated Company 057024', 'NBIZ_057024', 'contact_057024@company.com', '+9876543210', NULL, 0, '2026-10-13 19:00:57');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (181, 'Al Madina Mobile Zone 8315', 'AMMZ81', 'auto_8315@madina.com', NULL, NULL, 1, '2026-10-13 19:00:58');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (186, 'Tenant Test Biz 141776', 'TTB_141776', NULL, NULL, NULL, 1, '2026-10-13 19:02:21');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (187, 'Updated Company 142139', 'NBIZ_142139', 'contact_142139@company.com', '+9876543210', NULL, 1, '2026-10-13 19:02:22');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (188, 'Al Madina Mobile Zone 3561', 'AMMZ31', 'auto_3561@madina.com', NULL, NULL, 1, '2026-10-13 19:02:23');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (193, 'Tenant Test Biz 436128', 'TTB_436128', NULL, NULL, NULL, 1, '2026-10-13 19:07:16');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (194, 'Updated Company 436529', 'NBIZ_436529', 'contact_436529@company.com', '+9876543210', NULL, 0, '2026-10-13 19:07:16');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (195, 'Al Madina Mobile Zone 8070', 'AMMZ82', 'auto_8070@madina.com', NULL, NULL, 1, '2026-10-13 19:07:18');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (200, 'Tenant Test Biz 422071', 'TTB_422071', NULL, NULL, NULL, 1, '2026-10-13 19:23:42');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (201, 'Updated Company 422444', 'NBIZ_422444', 'contact_422444@company.com', '+9876543210', NULL, 0, '2026-10-13 19:23:42');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (202, 'Al Madina Mobile Zone 3769', 'AMMZ32', 'auto_3769@madina.com', NULL, NULL, 1, '2026-10-13 19:23:43');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (207, 'Tenant Test Biz 106490', 'TTB_106490', NULL, NULL, NULL, 1, '2026-10-13 19:35:06');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (208, 'Updated Company 106938', 'NBIZ_106938', 'contact_106938@company.com', '+9876543210', NULL, 0, '2026-10-13 19:35:06');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (209, 'Al Madina Mobile Zone 8146', 'AMMZ83', 'auto_8146@madina.com', NULL, NULL, 1, '2026-10-13 19:35:08');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (214, 'Tenant Test Biz 523388', 'TTB_523388', NULL, NULL, NULL, 1, '2026-10-13 19:42:03');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (215, 'Updated Company 523763', 'NBIZ_523763', 'contact_523763@company.com', '+9876543210', NULL, 0, '2026-10-13 19:42:03');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (216, 'Al Madina Mobile Zone 4925', 'AMMZ4', 'auto_4925@madina.com', NULL, NULL, 1, '2026-10-13 19:42:04');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (221, 'Tenant Test Biz 119064', 'TTB_119064', NULL, NULL, NULL, 1, '2026-10-13 19:51:59');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (222, 'Updated Company 119469', 'NBIZ_119469', 'contact_119469@company.com', '+9876543210', NULL, 0, '2026-10-13 19:51:59');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (223, 'Al Madina Mobile Zone 0676', 'AMMZ0', 'auto_0676@madina.com', NULL, NULL, 1, '2026-10-13 19:52:00');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (228, 'Tenant Test Biz 150714', 'TTB_150714', NULL, NULL, NULL, 1, '2026-10-13 19:52:30');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (229, 'Updated Company 151102', 'NBIZ_151102', 'contact_151102@company.com', '+9876543210', NULL, 0, '2026-10-13 19:52:31');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (230, 'Al Madina Mobile Zone 2277', 'AMMZ21', 'auto_2277@madina.com', NULL, NULL, 1, '2026-10-13 19:52:32');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (235, 'Tenant Test Biz 308020', 'TTB_308020', NULL, NULL, NULL, 1, '2026-10-13 19:55:08');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (236, 'Updated Company 308463', 'NBIZ_308463', 'contact_308463@company.com', '+9876543210', NULL, 0, '2026-10-13 19:55:08');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (237, 'Al Madina Mobile Zone 9991', 'AMMZ9', 'auto_9991@madina.com', NULL, NULL, 1, '2026-10-13 19:55:09');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (242, 'Tenant Test Biz 348582', 'TTB_348582', NULL, NULL, NULL, 1, '2026-10-13 20:12:28');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (243, 'Updated Company 348981', 'NBIZ_348981', 'contact_348981@company.com', '+9876543210', NULL, 0, '2026-10-13 20:12:29');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (244, 'Al Madina Mobile Zone 0160', 'AMMZ01', 'auto_0160@madina.com', NULL, NULL, 1, '2026-10-13 20:12:30');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (249, 'Tenant Test Biz 464579', 'TTB_464579', NULL, NULL, NULL, 1, '2026-10-14 10:24:24');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (250, 'Updated Company 464938', 'NBIZ_464938', 'contact_464938@company.com', '+9876543210', NULL, 0, '2026-10-14 10:24:24');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (252, 'Al Madina Mobile Zone 6766', 'AMMZ6', 'auto_6766@madina.com', NULL, NULL, 1, '2026-10-14 10:24:26');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (256, 'Tenant Test Biz 755593', 'TTB_755593', NULL, NULL, NULL, 1, '2026-10-14 10:29:15');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (257, 'Updated Company 755964', 'NBIZ_755964', 'contact_755964@company.com', '+9876543210', NULL, 0, '2026-10-14 10:29:16');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (259, 'Al Madina Mobile Zone 8043', 'AMMZ84', 'auto_8043@madina.com', NULL, NULL, 1, '2026-10-14 10:29:18');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (264, 'Tenant Test Biz 980087', 'TTB_980087', NULL, NULL, NULL, 1, '2026-10-14 10:33:00');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (265, 'Updated Company 981054', 'NBIZ_981054', 'contact_981054@company.com', '+9876543210', NULL, 0, '2026-10-14 10:33:01');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (267, 'Al Madina Mobile Zone 3115', 'AMMZ33', 'auto_3115@madina.com', NULL, NULL, 1, '2026-10-14 10:33:03');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (274, 'Tenant Test Biz 240091', 'TTB_240091', NULL, NULL, NULL, 1, '2026-10-14 10:37:20');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (276, 'Updated Company 240464', 'NBIZ_240464', 'contact_240464@company.com', '+9876543210', NULL, 0, '2026-10-14 10:37:20');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (277, 'Al Madina Mobile Zone 2165', 'AMMZ22', 'auto_2165@madina.com', NULL, NULL, 1, '2026-10-14 10:37:22');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (282, 'Tenant Test Biz 417431', 'TTB_417431', NULL, NULL, NULL, 1, '2026-10-14 17:20:17');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (284, 'Updated Company 417950', 'NBIZ_417950', 'contact_417950@company.com', '+9876543210', NULL, 0, '2026-10-14 17:20:18');
INSERT INTO `businesses` (`id`, `name`, `code`, `email`, `phone`, `address`, `is_active`, `created_at`) VALUES (285, 'Al Madina Mobile Zone 9784', 'AMMZ91', 'auto_9784@madina.com', NULL, NULL, 1, '2026-10-14 17:20:19');

DROP TABLE IF EXISTS `cash_register_sessions`;
CREATE TABLE `cash_register_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `business_date` date NOT NULL,
  `opening_cash` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expected_cash` decimal(12,2) DEFAULT NULL,
  `actual_cash` decimal(12,2) DEFAULT NULL,
  `discrepancy` decimal(12,2) DEFAULT NULL,
  `status` enum('open','pending_verification','closed') NOT NULL DEFAULT 'open',
  `opened_by` int NOT NULL,
  `closed_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cash_register_branch_date` (`branch_id`,`business_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `name` varchar(80) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_category_biz_name` (`business_id`,`name`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `categories`
INSERT INTO `categories` (`id`, `business_id`, `name`, `created_at`) VALUES (1, 1, 'Accessories', '2026-10-13 08:36:19');
INSERT INTO `categories` (`id`, `business_id`, `name`, `created_at`) VALUES (2, 1, 'Chargers & Cables', '2026-10-13 08:36:19');
INSERT INTO `categories` (`id`, `business_id`, `name`, `created_at`) VALUES (3, 1, 'Spare Parts', '2026-10-13 08:36:19');
INSERT INTO `categories` (`id`, `business_id`, `name`, `created_at`) VALUES (4, 1, 'Repair Services', '2026-10-13 08:36:19');
INSERT INTO `categories` (`id`, `business_id`, `name`, `created_at`) VALUES (7, 20, 'Fast Chargers', '2026-10-13 08:52:17');

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `category` enum('salary','utility_bill','transport','misc') NOT NULL,
  `title` varchar(120) NOT NULL,
  `expense_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `deletion_reason` text,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_expenses_date` (`expense_date`),
  KEY `idx_expenses_is_deleted` (`is_deleted`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `expenses`
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (1, 1, 'salary', 'Bill', '2026-10-07 19:00:00', '50000.00', NULL, 1, '2026-10-08 10:37:40', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (2, 1, 'salary', 'sadsadsad', '2026-10-07 19:00:00', '5000.00', NULL, 1, '2026-10-08 10:37:49', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (3, 1, 'misc', 'hello', '2026-10-11 19:00:00', '200.00', NULL, 1, '2026-10-12 19:29:20', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (4, 236, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:00:26', 1, '2026-10-13 19:00:26', 100000, 'Entered in error for testing');
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (5, 247, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:00:58', 1, '2026-10-13 19:00:58', 100000, 'Entered in error for testing');
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (6, 258, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:02:23', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (7, 269, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:07:18', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (8, 280, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:23:43', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (9, 291, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:35:08', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (10, 302, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:42:05', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (11, 313, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:52:00', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (12, 324, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:52:32', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (13, 335, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 19:55:10', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (14, 346, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-13 20:12:30', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (15, 357, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-14 10:24:26', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (16, 368, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-14 10:29:18', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (17, 381, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-14 10:33:03', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (18, 396, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-14 10:37:22', 0, NULL, NULL, NULL);
INSERT INTO `expenses` (`id`, `branch_id`, `category`, `title`, `expense_date`, `amount`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (19, 408, 'misc', 'Temporary Test Expense', '2026-10-13 19:00:00', '1500.00', NULL, 100000, '2026-10-14 17:20:19', 0, NULL, NULL, NULL);

DROP TABLE IF EXISTS `mobile_models`;
CREATE TABLE `mobile_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL DEFAULT '1',
  `company` varchar(80) NOT NULL,
  `model_name` varchar(120) NOT NULL,
  `variant` varchar(80) DEFAULT NULL,
  `color` varchar(80) DEFAULT NULL,
  `storage` varchar(80) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_model` (`company`,`model_name`,`variant`,`color`,`storage`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `mobile_models`
INSERT INTO `mobile_models` (`id`, `business_id`, `company`, `model_name`, `variant`, `color`, `storage`, `created_at`) VALUES (1, 1, 'Samsung', 'Galaxy A15', '4G', 'Black', '128GB', '2026-04-21 11:24:50');
INSERT INTO `mobile_models` (`id`, `business_id`, `company`, `model_name`, `variant`, `color`, `storage`, `created_at`) VALUES (2, 1, 'Infinix', 'Note 30', 'Base', 'Blue', '256GB', '2026-04-21 11:24:50');
INSERT INTO `mobile_models` (`id`, `business_id`, `company`, `model_name`, `variant`, `color`, `storage`, `created_at`) VALUES (15, 20, 'Apple', 'iPhone 15 Pro', NULL, NULL, NULL, '2026-10-13 08:52:18');
INSERT INTO `mobile_models` (`id`, `business_id`, `company`, `model_name`, `variant`, `color`, `storage`, `created_at`) VALUES (35, 41, 'Google', 'Pixel 8', NULL, NULL, NULL, '2026-10-13 08:58:54');

DROP TABLE IF EXISTS `mobile_units`;
CREATE TABLE `mobile_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL DEFAULT '1',
  `imei` varchar(32) NOT NULL,
  `model_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `current_status` enum('in_stock','reserved','sold','returned','cancelled','in_transit','returned_to_vendor') NOT NULL DEFAULT 'in_stock',
  `purchase_order_id` int DEFAULT NULL,
  `sale_order_id` int DEFAULT NULL,
  `cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mobile_units_business_imei` (`business_id`,`imei`),
  KEY `model_id` (`model_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `idx_mobile_units_branch_status` (`branch_id`,`current_status`),
  KEY `idx_mobile_units_business` (`business_id`),
  CONSTRAINT `mobile_units_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `mobile_models` (`id`),
  CONSTRAINT `mobile_units_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `mobile_units_ibfk_3` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=361 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `mobile_units`
INSERT INTO `mobile_units` (`id`, `business_id`, `imei`, `model_id`, `branch_id`, `current_status`, `purchase_order_id`, `sale_order_id`, `cost_price`, `sale_price`, `created_at`, `updated_at`) VALUES (1, 1, '13131321321321321', 1, 1, 'in_stock', 1, NULL, '10000.00', NULL, '2026-10-08 08:30:03', '2026-10-08 08:30:03');
INSERT INTO `mobile_units` (`id`, `business_id`, `imei`, `model_id`, `branch_id`, `current_status`, `purchase_order_id`, `sale_order_id`, `cost_price`, `sale_price`, `created_at`, `updated_at`) VALUES (2, 1, '87216387216387168716', 2, 1, 'in_stock', 1, NULL, '55000.00', NULL, '2026-10-08 08:30:03', '2026-10-08 08:30:03');
INSERT INTO `mobile_units` (`id`, `business_id`, `imei`, `model_id`, `branch_id`, `current_status`, `purchase_order_id`, `sale_order_id`, `cost_price`, `sale_price`, `created_at`, `updated_at`) VALUES (18, 20, '358999881538166', 15, 16, 'sold', 12, 1, '250000.00', '290000.00', '2026-10-13 08:52:18', '2026-10-13 08:52:18');

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `notification_type` enum('receivable_due','receivable_overdue','payable_due','payable_overdue','stock_transfer','order_return','stock_alert','system') NOT NULL,
  `reference_type` enum('receivable','payable','stock_transfer','order_return','inventory','general') NOT NULL,
  `reference_id` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `due_date` date DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_notifications_ref` (`reference_type`,`reference_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `notifications`
INSERT INTO `notifications` (`id`, `branch_id`, `notification_type`, `reference_type`, `reference_id`, `title`, `message`, `due_date`, `is_read`, `created_at`) VALUES (1, 56, 'stock_transfer', 'stock_transfer', 3, 'Incoming Stock Transfer', 'Transfer TRF-000003 has been dispatched to your branch.', NULL, 0, '2026-10-13 09:05:51');
INSERT INTO `notifications` (`id`, `branch_id`, `notification_type`, `reference_type`, `reference_id`, `title`, `message`, `due_date`, `is_read`, `created_at`) VALUES (2, 56, 'stock_transfer', 'stock_transfer', 4, 'Incoming Stock Transfer', 'Transfer TRF-000004 has been dispatched to your branch.', NULL, 0, '2026-10-13 09:05:51');

DROP TABLE IF EXISTS `order_return_items`;
CREATE TABLE `order_return_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int NOT NULL,
  `mobile_unit_id` int DEFAULT NULL,
  `imei` varchar(32) DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `refund_rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `item_condition` enum('good','damaged','defective') NOT NULL DEFAULT 'good',
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`),
  KEY `mobile_unit_id` (`mobile_unit_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `order_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_return_items_ibfk_2` FOREIGN KEY (`mobile_unit_id`) REFERENCES `mobile_units` (`id`),
  CONSTRAINT `order_return_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `order_returns`;
CREATE TABLE `order_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `return_number` varchar(50) NOT NULL,
  `return_type` enum('customer_return','vendor_return') NOT NULL,
  `reference_type` enum('sale_order','purchase_order') NOT NULL,
  `reference_id` int NOT NULL,
  `party_id` int DEFAULT NULL,
  `return_date` date NOT NULL,
  `total_refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `idx_returns_biz` (`business_id`),
  KEY `branch_id` (`branch_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `order_returns_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `order_returns_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `order_returns_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `parties`;
CREATE TABLE `parties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL DEFAULT '1',
  `branch_id` int DEFAULT NULL,
  `party_type` enum('vendor','customer','both') NOT NULL DEFAULT 'customer',
  `name` varchar(120) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `cnic` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `parties_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `parties`
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (1, 1, 1, 'vendor', 'Default Vendor', '03001234567', '35202-1234567-1', 'Lahore', 'Seed vendor', '2026-04-21 11:24:49');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (2, 1, 1, 'customer', 'Walk In Customer', '03007654321', NULL, 'Shop', 'Seed customer', '2026-04-21 11:24:49');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (3, 1, 1, 'customer', 'Ahsan Ullah Mirza', '03344621248', '42342424324322', 'Office B210 arfa kareem block', '', '2026-10-08 08:31:59');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (4, 20, 16, 'customer', 'Ahmed Buyer', '03211234567', NULL, NULL, 'Created during sale', '2026-10-13 08:52:18');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (5, 23, 20, 'customer', 'Ahmed Buyer', '03211234567', NULL, NULL, 'Created during sale', '2026-10-13 08:53:07');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (6, 26, 24, 'customer', 'Ahmed Buyer', '03211234567', NULL, NULL, 'Created during sale', '2026-10-13 08:53:29');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (7, 29, 28, 'customer', 'Ahmed Buyer', '03211234567', NULL, NULL, 'Created during sale', '2026-10-13 08:53:54');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (8, 32, 32, 'customer', 'Ahmed Buyer', '03211234567', NULL, NULL, 'Created during sale', '2026-10-13 08:54:35');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (10, 41, 43, 'vendor', 'Supplier Mega', NULL, NULL, NULL, NULL, '2026-10-13 08:58:54');
INSERT INTO `parties` (`id`, `business_id`, `branch_id`, `party_type`, `name`, `phone`, `cnic`, `address`, `notes`, `created_at`) VALUES (30, 1, 1, 'customer', 'Dr. Mirza Ahsan Ullah', '03344621248', '', 'Ali street near Ghousia Masjid Sabowal road mohallah Islam Nagar', '', '2026-10-13 12:00:17');

DROP TABLE IF EXISTS `partner_branch_shares`;
CREATE TABLE `partner_branch_shares` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `partner_id` int NOT NULL,
  `share_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_branch_partner` (`branch_id`,`partner_id`),
  KEY `business_id` (`business_id`),
  KEY `partner_id` (`partner_id`),
  CONSTRAINT `partner_branch_shares_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `partner_branch_shares_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `partner_branch_shares_ibfk_3` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `partner_branch_shares`
INSERT INTO `partner_branch_shares` (`id`, `business_id`, `branch_id`, `partner_id`, `share_percentage`, `created_at`, `updated_at`) VALUES (1, 20, 16, 5, '60.00', '2026-10-13 08:52:18', '2026-10-13 08:52:18');
INSERT INTO `partner_branch_shares` (`id`, `business_id`, `branch_id`, `partner_id`, `share_percentage`, `created_at`, `updated_at`) VALUES (2, 20, 16, 6, '40.00', '2026-10-13 08:52:18', '2026-10-13 08:52:18');

DROP TABLE IF EXISTS `partners`;
CREATE TABLE `partners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `cnic` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `partners_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `partners`
INSERT INTO `partners` (`id`, `business_id`, `name`, `phone`, `cnic`, `is_active`, `created_at`) VALUES (5, 20, 'Bilal Partner', '03009998877', '35201-1234567-1', 1, '2026-10-13 08:52:17');
INSERT INTO `partners` (`id`, `business_id`, `name`, `phone`, `cnic`, `is_active`, `created_at`) VALUES (6, 20, 'Zubair Partner', '03001112233', '35201-7654321-2', 1, '2026-10-13 08:52:18');

DROP TABLE IF EXISTS `payables`;
CREATE TABLE `payables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int NOT NULL,
  `party_id` int DEFAULT NULL,
  `branch_id` int NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_order_id` (`purchase_order_id`),
  KEY `party_id` (`party_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `payables_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payables_ibfk_2` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `payables_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `payables`
INSERT INTO `payables` (`id`, `purchase_order_id`, `party_id`, `branch_id`, `total_amount`, `paid_amount`, `balance_amount`, `due_date`, `status`, `created_at`) VALUES (1, 1, NULL, 1, '65000.00', '50000.00', '15000.00', NULL, 'partial', '2026-10-08 08:30:03');

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference_type` enum('sale','purchase','order_return') NOT NULL,
  `reference_id` int NOT NULL,
  `direction` enum('in','out') NOT NULL,
  `branch_id` int NOT NULL,
  `party_id` int DEFAULT NULL,
  `payment_method` enum('cash','bank_transfer','mobile_wallet') NOT NULL DEFAULT 'cash',
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `idempotency_key` varchar(120) DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_payment_idempotency` (`created_by`,`idempotency_key`),
  KEY `branch_id` (`branch_id`),
  KEY `party_id` (`party_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=247 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `payments`
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (1, 'purchase', 12, 'out', 16, NULL, 'cash', '260000.00', '2026-10-12 19:00:00', NULL, 'Initial purchase payment', 100048, '2026-10-13 08:52:18');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (2, 'sale', 1, 'in', 16, 4, 'cash', '294500.00', '2026-10-12 19:00:00', NULL, 'Initial sale payment', 100048, '2026-10-13 08:52:18');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (3, 'purchase', 15, 'out', 20, NULL, 'cash', '260000.00', '2026-10-12 19:00:00', NULL, 'Initial purchase payment', 100052, '2026-10-13 08:53:07');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (4, 'sale', 2, 'in', 20, 5, 'cash', '294500.00', '2026-10-12 19:00:00', NULL, 'Initial sale payment', 100052, '2026-10-13 08:53:07');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (5, 'purchase', 18, 'out', 24, NULL, 'cash', '260000.00', '2026-10-12 19:00:00', NULL, 'Initial purchase payment', 100056, '2026-10-13 08:53:29');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (6, 'sale', 3, 'in', 24, 6, 'cash', '294500.00', '2026-10-12 19:00:00', NULL, 'Initial sale payment', 100056, '2026-10-13 08:53:29');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (7, 'purchase', 21, 'out', 28, NULL, 'cash', '260000.00', '2026-10-12 19:00:00', NULL, 'Initial purchase payment', 100060, '2026-10-13 08:53:54');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (8, 'sale', 4, 'in', 28, 7, 'cash', '294500.00', '2026-10-12 19:00:00', NULL, 'Initial sale payment', 100060, '2026-10-13 08:53:54');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (13, 'purchase', 32, 'out', 43, 10, 'cash', '85000.00', '2026-10-12 19:00:00', NULL, 'Initial purchase payment', 100076, '2026-10-13 08:58:54');
INSERT INTO `payments` (`id`, `reference_type`, `reference_id`, `direction`, `branch_id`, `party_id`, `payment_method`, `amount`, `payment_date`, `idempotency_key`, `notes`, `created_by`, `created_at`) VALUES (220, 'purchase', 1, 'out', 1, NULL, 'cash', '50000.00', '2026-10-13 19:00:00', NULL, NULL, 1, '2026-10-14 05:33:06');

DROP TABLE IF EXISTS `product_stocks`;
CREATE TABLE `product_stocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_branch_stock` (`branch_id`,`product_id`),
  KEY `business_id` (`business_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_stocks_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `product_stocks_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `product_stocks_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `product_stocks`
INSERT INTO `product_stocks` (`id`, `business_id`, `branch_id`, `product_id`, `quantity`, `updated_at`) VALUES (1, 20, 16, 4, 25, '2026-10-13 08:52:17');
INSERT INTO `product_stocks` (`id`, `business_id`, `branch_id`, `product_id`, `quantity`, `updated_at`) VALUES (2, 20, 16, 5, 17, '2026-10-13 08:52:18');

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `item_type` enum('handset','accessory','part','service') NOT NULL DEFAULT 'accessory',
  `has_imei` tinyint(1) NOT NULL DEFAULT '0',
  `cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sale_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `alert_quantity` int NOT NULL DEFAULT '5',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_biz_name` (`business_id`,`name`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `products`
INSERT INTO `products` (`id`, `business_id`, `category_id`, `name`, `sku`, `barcode`, `item_type`, `has_imei`, `cost_price`, `sale_price`, `alert_quantity`, `is_active`, `created_at`, `updated_at`) VALUES (4, 20, 7, 'Anker 65W GaN Charger', 'ANK-65W-7844', NULL, 'accessory', 0, '2000.00', '3500.00', 5, 1, '2026-10-13 08:52:17', '2026-10-13 08:52:17');
INSERT INTO `products` (`id`, `business_id`, `category_id`, `name`, `sku`, `barcode`, `item_type`, `has_imei`, `cost_price`, `sale_price`, `alert_quantity`, `is_active`, `created_at`, `updated_at`) VALUES (5, 20, NULL, 'Silicone Case 15 Pro', 'CASE-15P-8106', NULL, 'accessory', 0, '500.00', '1500.00', 5, 1, '2026-10-13 08:52:18', '2026-10-13 08:52:18');
INSERT INTO `products` (`id`, `business_id`, `category_id`, `name`, `sku`, `barcode`, `item_type`, `has_imei`, `cost_price`, `sale_price`, `alert_quantity`, `is_active`, `created_at`, `updated_at`) VALUES (16, 41, NULL, 'Pixel Case', 'PIX-CASE-4332', NULL, 'accessory', 0, '800.00', '1500.00', 5, 1, '2026-10-13 08:58:54', '2026-10-13 08:58:54');

DROP TABLE IF EXISTS `purchase_order_items`;
CREATE TABLE `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int NOT NULL,
  `model_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `mobile_unit_id` int DEFAULT NULL,
  `imei` varchar(32) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `model_id` (`model_id`),
  KEY `mobile_unit_id` (`mobile_unit_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `mobile_models` (`id`),
  CONSTRAINT `purchase_order_items_ibfk_3` FOREIGN KEY (`mobile_unit_id`) REFERENCES `mobile_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `purchase_order_items`
INSERT INTO `purchase_order_items` (`id`, `purchase_order_id`, `model_id`, `product_id`, `mobile_unit_id`, `imei`, `quantity`, `unit_cost`, `created_at`) VALUES (1, 1, 1, NULL, 1, '13131321321321321', 1, '10000.00', '2026-10-08 08:30:03');
INSERT INTO `purchase_order_items` (`id`, `purchase_order_id`, `model_id`, `product_id`, `mobile_unit_id`, `imei`, `quantity`, `unit_cost`, `created_at`) VALUES (2, 1, 2, NULL, 2, '87216387216387168716', 1, '55000.00', '2026-10-08 08:30:03');

DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(30) NOT NULL,
  `branch_id` int NOT NULL,
  `vendor_id` int DEFAULT NULL,
  `purchaser_name` varchar(120) DEFAULT NULL,
  `purchaser_cnic` varchar(30) DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `deletion_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `branch_id` (`branch_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_purchase_orders_date` (`purchase_date`),
  KEY `idx_purchase_orders_is_deleted` (`is_deleted`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `purchase_orders`
INSERT INTO `purchase_orders` (`id`, `invoice_number`, `branch_id`, `vendor_id`, `purchaser_name`, `purchaser_cnic`, `purchase_date`, `subtotal`, `tax_amount`, `total_amount`, `paid_amount`, `balance_amount`, `due_date`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (1, 'PUR-000001', 1, NULL, NULL, NULL, '2026-10-07 19:00:00', '65000.00', '0.00', '65000.00', '50000.00', '15000.00', NULL, NULL, 1, '2026-10-08 08:30:03', 0, NULL, NULL, NULL);
INSERT INTO `purchase_orders` (`id`, `invoice_number`, `branch_id`, `vendor_id`, `purchaser_name`, `purchaser_cnic`, `purchase_date`, `subtotal`, `tax_amount`, `total_amount`, `paid_amount`, `balance_amount`, `due_date`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (12, 'PUR-000012', 16, NULL, NULL, NULL, '2026-10-12 19:00:00', '260000.00', '0.00', '260000.00', '260000.00', '0.00', NULL, NULL, 100048, '2026-10-13 08:52:18', 0, NULL, NULL, NULL);
INSERT INTO `purchase_orders` (`id`, `invoice_number`, `branch_id`, `vendor_id`, `purchaser_name`, `purchaser_cnic`, `purchase_date`, `subtotal`, `tax_amount`, `total_amount`, `paid_amount`, `balance_amount`, `due_date`, `notes`, `created_by`, `created_at`, `is_deleted`, `deleted_at`, `deleted_by`, `deletion_reason`) VALUES (32, 'PUR-000032', 43, 10, NULL, NULL, '2026-10-12 19:00:00', '85000.00', '0.00', '85000.00', '85000.00', '0.00', NULL, NULL, 100076, '2026-10-13 08:58:54', 0, NULL, NULL, NULL);

DROP TABLE IF EXISTS `receivables`;
CREATE TABLE `receivables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sale_order_id` int NOT NULL,
  `party_id` int DEFAULT NULL,
  `branch_id` int NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `status` enum('pending','partial','paid','overdue') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sale_order_id` (`sale_order_id`),
  KEY `party_id` (`party_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `receivables_ibfk_1` FOREIGN KEY (`sale_order_id`) REFERENCES `sale_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receivables_ibfk_2` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `receivables_ibfk_3` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `repair_tickets`;
CREATE TABLE `repair_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(120) NOT NULL,
  `customer_phone` varchar(30) DEFAULT NULL,
  `model_name` varchar(120) NOT NULL,
  `imei` varchar(32) DEFAULT NULL,
  `serial_number` varchar(50) DEFAULT NULL,
  `issue_description` text NOT NULL,
  `estimated_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `actual_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `advance_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('received','diagnosing','waiting_parts','repaired','delivered','cancelled') NOT NULL DEFAULT 'received',
  `warranty_days` int NOT NULL DEFAULT '0',
  `warranty_until` date DEFAULT NULL,
  `technician_name` varchar(120) DEFAULT NULL,
  `diagnosis_notes` text,
  `received_date` date NOT NULL,
  `delivered_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_repairs_biz_branch` (`business_id`,`branch_id`),
  KEY `idx_repairs_status` (`status`),
  KEY `branch_id` (`branch_id`),
  KEY `customer_id` (`customer_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `repair_tickets_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `repair_tickets_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `repair_tickets_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `repair_tickets_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=587 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `roles`
INSERT INTO `roles` (`id`, `name`) VALUES (1, 'admin');
INSERT INTO `roles` (`id`, `name`) VALUES (5, 'business_super_admin');
INSERT INTO `roles` (`id`, `name`) VALUES (3, 'cashier');
INSERT INTO `roles` (`id`, `name`) VALUES (2, 'manager');
INSERT INTO `roles` (`id`, `name`) VALUES (4, 'top_admin');

DROP TABLE IF EXISTS `sale_order_items`;
CREATE TABLE `sale_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sale_order_id` int NOT NULL,
  `mobile_unit_id` int DEFAULT NULL,
  `imei` varchar(32) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `model_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sale_order_id` (`sale_order_id`),
  KEY `mobile_unit_id` (`mobile_unit_id`),
  KEY `model_id` (`model_id`),
  CONSTRAINT `sale_order_items_ibfk_1` FOREIGN KEY (`sale_order_id`) REFERENCES `sale_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_order_items_ibfk_2` FOREIGN KEY (`mobile_unit_id`) REFERENCES `mobile_units` (`id`),
  CONSTRAINT `sale_order_items_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `mobile_models` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sale_orders`;
CREATE TABLE `sale_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(30) NOT NULL,
  `branch_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `sale_date` date NOT NULL,
  `payment_method` enum('cash','bank_transfer','mobile_wallet') NOT NULL DEFAULT 'cash',
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `deletion_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `branch_id` (`branch_id`),
  KEY `customer_id` (`customer_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_sale_orders_date` (`sale_date`),
  KEY `idx_sale_orders_is_deleted` (`is_deleted`),
  CONSTRAINT `sale_orders_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `sale_orders_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `parties` (`id`),
  CONSTRAINT `sale_orders_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `schema_migrations`
INSERT INTO `schema_migrations` (`id`, `filename`, `applied_at`) VALUES (1, '002_repair_tickets.sql', '2026-10-14 17:22:30');

DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `mobile_unit_id` int NOT NULL,
  `model_id` int NOT NULL,
  `movement_type` enum('purchase_in','sale_out','customer_return_in','supplier_return_out','transfer_out','transfer_in','adjustment_in','adjustment_out') NOT NULL,
  `reference_type` varchar(50) NOT NULL,
  `reference_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_stock_movement_unit_ref` (`mobile_unit_id`,`movement_type`,`reference_type`,`reference_id`)
) ENGINE=InnoDB AUTO_INCREMENT=367 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `stock_movements`
INSERT INTO `stock_movements` (`id`, `business_id`, `branch_id`, `mobile_unit_id`, `model_id`, `movement_type`, `reference_type`, `reference_id`, `quantity`, `unit_cost`, `unit_price`, `created_by`, `created_at`) VALUES (1, 20, 16, 18, 15, 'purchase_in', 'purchase_order', 12, 1, '250000.00', NULL, 100048, '2026-10-13 08:52:18');
INSERT INTO `stock_movements` (`id`, `business_id`, `branch_id`, `mobile_unit_id`, `model_id`, `movement_type`, `reference_type`, `reference_id`, `quantity`, `unit_cost`, `unit_price`, `created_by`, `created_at`) VALUES (2, 20, 16, 18, 15, 'sale_out', 'sale_order', 1, -1, NULL, '290000.00', 100048, '2026-10-13 08:52:18');

DROP TABLE IF EXISTS `stock_transfer_items`;
CREATE TABLE `stock_transfer_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int NOT NULL,
  `mobile_unit_id` int DEFAULT NULL,
  `imei` varchar(32) DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `received_quantity` int NOT NULL DEFAULT '0',
  `item_status` enum('pending','in_transit','received','missing','damaged') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `transfer_id` (`transfer_id`),
  KEY `mobile_unit_id` (`mobile_unit_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_items_ibfk_2` FOREIGN KEY (`mobile_unit_id`) REFERENCES `mobile_units` (`id`),
  CONSTRAINT `stock_transfer_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `stock_transfers`;
CREATE TABLE `stock_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `transfer_number` varchar(50) NOT NULL,
  `from_branch_id` int NOT NULL,
  `to_branch_id` int NOT NULL,
  `status` enum('pending','in_transit','completed','cancelled') NOT NULL DEFAULT 'pending',
  `notes` text,
  `discrepancy_notes` text,
  `created_by` int NOT NULL,
  `dispatched_by` int DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dispatched_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_number` (`transfer_number`),
  KEY `idx_transfers_biz_status` (`business_id`,`status`),
  KEY `from_branch_id` (`from_branch_id`),
  KEY `to_branch_id` (`to_branch_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`),
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `stock_transfers_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `subscription_payments`;
CREATE TABLE `subscription_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `duration_value` int NOT NULL DEFAULT '1',
  `duration_unit` enum('day','month','year') NOT NULL DEFAULT 'month',
  `payment_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `evidence_reference` varchar(255) DEFAULT NULL,
  `status` enum('submitted','verified','rejected') NOT NULL DEFAULT 'submitted',
  `rejection_reason` text,
  `submitted_by` int NOT NULL,
  `verified_by` int DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `period_start_date` date DEFAULT NULL,
  `period_end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sub_payments_status` (`status`),
  KEY `idx_sub_payments_biz_branch` (`business_id`,`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `subscription_payments`
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (1, 1, 1, 1, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Transfer', 'TXN-984321', 'verified', NULL, 1, 100000, '2026-10-13 14:32:06', '2026-10-13 19:46:59', 'Monthly subscription renewal proof submitted.', '2026-10-29 19:00:00', '2026-11-29 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (2, 85, 109, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-194878', 'verified', NULL, 100000, 100000, '2026-10-13 14:36:34', '2026-10-13 14:36:35', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (3, 91, 118, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-983206', 'verified', NULL, 100000, 100000, '2026-10-13 14:49:43', '2026-10-13 14:49:43', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (4, 97, 127, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-299873', 'verified', NULL, 100000, 100000, '2026-10-13 14:54:59', '2026-10-13 14:55:00', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (5, 103, 136, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-137036', 'verified', NULL, 100000, 100000, '2026-10-13 15:25:37', '2026-10-13 15:25:37', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (6, 109, 145, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-839083', 'verified', NULL, 100000, 100000, '2026-10-13 15:37:19', '2026-10-13 15:37:19', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (7, 115, 154, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-135863', 'verified', NULL, 100000, 100000, '2026-10-13 15:42:15', '2026-10-13 15:42:16', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (8, 118, 158, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-183564', 'verified', NULL, 100000, 100000, '2026-10-13 15:43:03', '2026-10-13 15:43:03', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (9, 124, 163, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-344624', 'verified', NULL, 100000, 100000, '2026-10-13 15:45:44', '2026-10-13 15:45:44', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (10, 130, 172, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-401020', 'verified', NULL, 100000, 100000, '2026-10-13 15:46:41', '2026-10-13 15:46:41', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (11, 137, 181, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-464635', 'verified', NULL, 100000, 100000, '2026-10-13 15:47:44', '2026-10-13 15:47:44', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (12, 144, 192, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-787180', 'verified', NULL, 100000, 100000, '2026-10-13 18:56:27', '2026-10-13 18:56:27', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (13, 151, 203, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-822443', 'verified', NULL, 100000, 100000, '2026-10-13 18:57:02', '2026-10-13 18:57:02', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (14, 158, 214, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-868127', 'verified', NULL, 100000, 100000, '2026-10-13 18:57:48', '2026-10-13 18:57:48', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (15, 165, 225, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-913368', 'verified', NULL, 100000, 100000, '2026-10-13 18:58:33', '2026-10-13 18:58:33', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (16, 172, 236, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-025372', 'verified', NULL, 100000, 100000, '2026-10-13 19:00:25', '2026-10-13 19:00:25', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (17, 179, 247, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-057808', 'verified', NULL, 100000, 100000, '2026-10-13 19:00:57', '2026-10-13 19:00:57', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (18, 186, 258, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-143052', 'verified', NULL, 100000, 100000, '2026-10-13 19:02:23', '2026-10-13 19:02:23', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (19, 193, 269, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-437423', 'verified', NULL, 100000, 100000, '2026-10-13 19:07:17', '2026-10-13 19:07:17', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (20, 200, 280, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-423209', 'verified', NULL, 100000, 100000, '2026-10-13 19:23:43', '2026-10-13 19:23:43', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (21, 207, 291, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-107646', 'verified', NULL, 100000, 100000, '2026-10-13 19:35:07', '2026-10-13 19:35:07', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (22, 214, 302, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-524471', 'verified', NULL, 100000, 100000, '2026-10-13 19:42:04', '2026-10-13 19:42:04', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (23, 221, 313, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-120196', 'verified', NULL, 100000, 100000, '2026-10-13 19:52:00', '2026-10-13 19:52:00', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (24, 228, 324, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-151795', 'verified', NULL, 100000, 100000, '2026-10-13 19:52:31', '2026-10-13 19:52:31', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (25, 235, 335, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-309381', 'verified', NULL, 100000, 100000, '2026-10-13 19:55:09', '2026-10-13 19:55:09', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (26, 242, 346, 2, '49.00', 1, 'month', '2026-10-12 19:00:00', 'Bank Wire', 'TXN-REF-349699', 'verified', NULL, 100000, 100000, '2026-10-13 20:12:29', '2026-10-13 20:12:29', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (27, 249, 357, 2, '49.00', 1, 'month', '2026-10-13 19:00:00', 'Bank Wire', 'TXN-REF-466283', 'verified', NULL, 100000, 100000, '2026-10-14 10:24:26', '2026-10-14 10:24:26', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (28, 256, 368, 2, '49.00', 1, 'month', '2026-10-13 19:00:00', 'Bank Wire', 'TXN-REF-757552', 'verified', NULL, 100000, 100000, '2026-10-14 10:29:17', '2026-10-14 10:29:17', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (29, 264, 381, 2, '49.00', 1, 'month', '2026-10-13 19:00:00', 'Bank Wire', 'TXN-REF-982628', 'verified', NULL, 100000, 100000, '2026-10-14 10:33:02', '2026-10-14 10:33:02', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (30, 274, 396, 2, '49.00', 1, 'month', '2026-10-13 19:00:00', 'Bank Wire', 'TXN-REF-241738', 'verified', NULL, 100000, 100000, '2026-10-14 10:37:21', '2026-10-14 10:37:21', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');
INSERT INTO `subscription_payments` (`id`, `business_id`, `branch_id`, `plan_id`, `amount`, `duration_value`, `duration_unit`, `payment_date`, `payment_method`, `evidence_reference`, `status`, `rejection_reason`, `submitted_by`, `verified_by`, `submitted_at`, `verified_at`, `notes`, `period_start_date`, `period_end_date`) VALUES (31, 282, 408, 2, '49.00', 1, 'month', '2026-10-13 19:00:00', 'Bank Wire', 'TXN-REF-419272', 'verified', NULL, 100000, 100000, '2026-10-14 17:20:19', '2026-10-14 17:20:19', 'Monthly fee', '2026-12-30 19:00:00', '2027-01-30 19:00:00');

DROP TABLE IF EXISTS `subscription_plan_features`;
CREATE TABLE `subscription_plan_features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `feature_key` varchar(60) NOT NULL,
  `feature_type` enum('page','report','feature') NOT NULL DEFAULT 'page',
  `is_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_plan_feature` (`plan_id`,`feature_key`),
  CONSTRAINT `subscription_plan_features_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `subscription_plan_features`
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (1, 18, 'dashboard', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (2, 18, 'sales', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (3, 18, 'purchases', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (4, 18, 'inventory', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (5, 18, 'cash_register', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (6, 18, 'parties', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (7, 18, 'expenses', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (8, 18, 'invoices', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (9, 18, 'reports_inventory', 'report', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (10, 18, 'stock_transfers', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (11, 18, 'order_returns', 'page', 1, '2026-10-14 09:52:40', '2026-10-14 09:52:40');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (12, 18, 'admin', 'page', 1, '2026-10-14 09:52:41', '2026-10-14 09:52:41');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (13, 18, 'reports_receivables', 'report', 1, '2026-10-14 09:52:41', '2026-10-14 09:52:41');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (14, 18, 'reports_payables', 'report', 1, '2026-10-14 09:52:41', '2026-10-14 09:52:41');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (15, 18, 'partner_shares', 'page', 1, '2026-10-14 09:52:41', '2026-10-14 09:52:41');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (16, 18, 'theme_selection', 'feature', 1, '2026-10-14 09:52:41', '2026-10-14 09:52:41');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (17, 29, 'dashboard', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (18, 29, 'sales', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (19, 29, 'purchases', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (20, 29, 'inventory', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (21, 29, 'cash_register', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (22, 29, 'parties', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (23, 29, 'expenses', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (24, 29, 'invoices', 'page', 1, '2026-10-14 10:24:25', '2026-10-14 10:24:25');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (25, 29, 'admin', 'page', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (26, 29, 'reports_inventory', 'report', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (27, 29, 'reports_receivables', 'report', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (28, 29, 'reports_payables', 'report', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (29, 29, 'stock_transfers', 'page', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (30, 29, 'order_returns', 'page', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (31, 29, 'partner_shares', 'page', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (32, 29, 'theme_selection', 'feature', 1, '2026-10-14 10:24:26', '2026-10-14 10:24:26');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (33, 30, 'dashboard', 'page', 1, '2026-10-14 10:29:16', '2026-10-14 10:29:16');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (34, 30, 'sales', 'page', 1, '2026-10-14 10:29:16', '2026-10-14 10:29:16');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (35, 30, 'purchases', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (36, 30, 'inventory', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (37, 30, 'cash_register', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (38, 30, 'parties', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (39, 30, 'expenses', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (40, 30, 'invoices', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (41, 30, 'admin', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (42, 30, 'reports_inventory', 'report', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (43, 30, 'reports_receivables', 'report', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (44, 30, 'reports_payables', 'report', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (45, 30, 'stock_transfers', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (46, 30, 'order_returns', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (47, 30, 'partner_shares', 'page', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (48, 30, 'theme_selection', 'feature', 1, '2026-10-14 10:29:17', '2026-10-14 10:29:17');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (49, 31, 'dashboard', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (50, 31, 'sales', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (51, 31, 'purchases', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (52, 31, 'inventory', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (53, 31, 'cash_register', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (54, 31, 'parties', 'page', 1, '2026-10-14 10:33:01', '2026-10-14 10:33:01');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (55, 31, 'expenses', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (56, 31, 'invoices', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (57, 31, 'admin', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (58, 31, 'reports_inventory', 'report', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (59, 31, 'reports_receivables', 'report', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (60, 31, 'reports_payables', 'report', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (61, 31, 'stock_transfers', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (62, 31, 'order_returns', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (63, 31, 'partner_shares', 'page', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (64, 31, 'theme_selection', 'feature', 1, '2026-10-14 10:33:02', '2026-10-14 10:33:02');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (65, 35, 'dashboard', 'page', 1, '2026-10-14 10:37:20', '2026-10-14 10:37:20');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (66, 35, 'sales', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (67, 35, 'purchases', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (68, 35, 'inventory', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (69, 35, 'cash_register', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (70, 35, 'parties', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (71, 35, 'expenses', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (72, 35, 'invoices', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (73, 35, 'admin', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (74, 35, 'reports_inventory', 'report', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (75, 35, 'reports_receivables', 'report', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (76, 35, 'reports_payables', 'report', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (77, 35, 'stock_transfers', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (78, 35, 'order_returns', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (79, 35, 'partner_shares', 'page', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (80, 35, 'theme_selection', 'feature', 1, '2026-10-14 10:37:21', '2026-10-14 10:37:21');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (81, 37, 'dashboard', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (82, 37, 'sales', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (83, 37, 'purchases', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (84, 37, 'inventory', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (85, 37, 'cash_register', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (86, 37, 'parties', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (87, 37, 'expenses', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (88, 37, 'invoices', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (89, 37, 'admin', 'page', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (90, 37, 'reports_inventory', 'report', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (91, 37, 'reports_receivables', 'report', 1, '2026-10-14 17:20:18', '2026-10-14 17:20:18');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (92, 37, 'reports_payables', 'report', 1, '2026-10-14 17:20:19', '2026-10-14 17:20:19');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (93, 37, 'stock_transfers', 'page', 1, '2026-10-14 17:20:19', '2026-10-14 17:20:19');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (94, 37, 'order_returns', 'page', 1, '2026-10-14 17:20:19', '2026-10-14 17:20:19');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (95, 37, 'partner_shares', 'page', 1, '2026-10-14 17:20:19', '2026-10-14 17:20:19');
INSERT INTO `subscription_plan_features` (`id`, `plan_id`, `feature_key`, `feature_type`, `is_allowed`, `created_at`, `updated_at`) VALUES (96, 37, 'theme_selection', 'feature', 1, '2026-10-14 17:20:19', '2026-10-14 17:20:19');

DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE `subscription_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `monthly_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `billing_period` varchar(30) NOT NULL DEFAULT 'monthly',
  `duration_value` int NOT NULL DEFAULT '1',
  `duration_unit` enum('day','month','year') NOT NULL DEFAULT 'month',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `max_branches` int NOT NULL DEFAULT '1',
  `allowed_pages` text,
  `trial_days` int NOT NULL DEFAULT '14',
  `grace_days` int NOT NULL DEFAULT '7',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `subscription_plans`
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (1, 'Starter', '0.00', 'monthly', 1, 'month', '0.00', 1, '["dashboard","sales","purchases","inventory","cash_register","parties","invoices"]', 14, 7, 1, NULL, '2026-10-12 18:06:06');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (2, 'Professional Monthly', '4999.00', 'monthly', 1, 'month', '4999.00', 3, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 14, 7, 1, 'Standard monthly plan for growing mobile businesses up to 3 branches.', '2026-10-13 14:32:04');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (3, 'Enterprise Annual', '49999.00', 'yearly', 1, 'year', '49999.00', 10, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares"]', 30, 14, 1, 'Comprehensive annual plan for established mobile retail chains.', '2026-10-13 14:32:04');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (4, 'Custom Semi-Annual 194763', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 14:36:34');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (5, 'Custom Semi-Annual 983071', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 14:49:43');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (6, 'Custom Semi-Annual 299756', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 14:54:59');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (7, 'Custom Semi-Annual 136935', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:25:36');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (8, 'Custom Semi-Annual 838934', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:37:18');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (9, 'Custom Semi-Annual 135778', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:42:15');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (10, 'Custom Semi-Annual 183479', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:43:03');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (11, 'Custom Semi-Annual 344476', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:45:44');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (12, 'Custom Semi-Annual 400872', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:46:40');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (13, 'Custom Semi-Annual 464520', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 15:47:44');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (14, 'Custom Semi-Annual 787023', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 18:56:27');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (15, 'Custom Semi-Annual 822339', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 18:57:02');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (16, 'Custom Semi-Annual 868022', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 18:57:48');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (17, 'Custom Semi-Annual 913265', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 18:58:33');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (18, 'Custom Semi-Annual 025246', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns","admin","reports_receivables","reports_payables","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-13 19:00:25');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (19, 'Custom Semi-Annual 057684', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:00:57');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (20, 'Custom Semi-Annual 142945', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:02:22');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (21, 'Custom Semi-Annual 437257', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:07:17');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (22, 'Custom Semi-Annual 423066', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:23:43');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (23, 'Custom Semi-Annual 107541', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:35:07');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (24, 'Custom Semi-Annual 524348', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:42:04');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (25, 'Custom Semi-Annual 120061', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:52:00');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (26, 'Custom Semi-Annual 151675', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:52:31');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (27, 'Custom Semi-Annual 309247', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 19:55:09');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (28, 'Custom Semi-Annual 349581', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","reports_inventory","stock_transfers","order_returns"]', 21, 10, 1, '6 month package', '2026-10-13 20:12:29');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (29, 'Custom Semi-Annual 465504', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-14 10:24:25');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (30, 'Custom Semi-Annual 756915', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-14 10:29:16');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (31, 'Custom Semi-Annual 981672', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-14 10:33:01');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (35, 'Custom Semi-Annual 240943', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-14 10:37:20');
INSERT INTO `subscription_plans` (`id`, `name`, `monthly_price`, `billing_period`, `duration_value`, `duration_unit`, `price`, `max_branches`, `allowed_pages`, `trial_days`, `grace_days`, `is_active`, `description`, `created_at`) VALUES (37, 'Custom Semi-Annual 418500', '249.99', 'custom', 6, 'month', '249.99', 8, '["dashboard","sales","purchases","inventory","cash_register","parties","expenses","invoices","admin","reports_inventory","reports_receivables","reports_payables","stock_transfers","order_returns","partner_shares","theme_selection"]', 21, 10, 1, '6 month package', '2026-10-14 17:20:18');

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `page_key` varchar(50) NOT NULL,
  `action_key` varchar(50) NOT NULL,
  `is_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_permission` (`user_id`,`page_key`,`action_key`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=304 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `user_permissions`
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (73, 1, 'dashboard', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (74, 1, 'purchases', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (75, 1, 'purchases', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (76, 1, 'sales', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (77, 1, 'sales', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (78, 1, 'cash_register', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (79, 1, 'cash_register', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (80, 1, 'cash_register', 'close', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (81, 1, 'cash_register', 'verify', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (82, 1, 'inventory', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (83, 1, 'inventory', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (84, 1, 'parties', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (85, 1, 'parties', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (86, 1, 'expenses', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (87, 1, 'expenses', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (88, 1, 'invoices', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (89, 1, 'invoices', 'payment', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (90, 1, 'reports', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (91, 1, 'branches', 'view', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (92, 1, 'branches', 'create', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (93, 1, 'branches', 'edit', 1, '2026-10-14 05:35:44', '2026-10-14 05:35:44');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (98, 100385, 'dashboard', 'view', 1, '2026-10-14 10:24:23', '2026-10-14 10:24:23');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (99, 100385, 'sales', 'view', 1, '2026-10-14 10:24:23', '2026-10-14 10:24:23');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (100, 100385, 'sales', 'create', 1, '2026-10-14 10:24:23', '2026-10-14 10:24:23');
INSERT INTO `user_permissions` (`id`, `user_id`, `page_key`, `action_key`, `is_allowed`, `created_at`, `updated_at`) VALUES (101, 100385, 'inventory', 'view', 1, '2026-10-14 10:24:23', '2026-10-14 10:24:23');

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int DEFAULT NULL,
  `role_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100463 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table `users`
