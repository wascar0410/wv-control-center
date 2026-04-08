-- Seed Data for WV Control Center
-- Insert test data for end-to-end flow validation

-- 1. Create Company
INSERT INTO companies (name, dotNumber, mcNumber, email, phone, website, address, city, state, zipCode, complianceStatus, ownerId, createdAt, updatedAt)
VALUES ('WV Logistics Test', FLOOR(RAND() * 9000000 + 1000000), CONCAT('MC-', FLOOR(RAND() * 900000 + 100000)), 'test@wvlogistics.com', '555-0100', 'https://wvlogistics.com', '123 Main St', 'Charleston', 'WV', '25301', 'active', 1, NOW(), NOW());

SET @companyId = LAST_INSERT_ID();

-- 2. Create Users
INSERT INTO users (name, email, role, openId, loginMethod, createdAt, updatedAt, lastSignedIn)
VALUES ('Test Admin', 'admin@test.com', 'admin', CONCAT('admin-', UNIX_TIMESTAMP()), 'oauth', NOW(), NOW(), NOW());

SET @adminId = LAST_INSERT_ID();

INSERT INTO users (name, email, role, openId, loginMethod, createdAt, updatedAt, lastSignedIn)
VALUES ('Test Dispatcher', 'dispatcher@test.com', 'admin', CONCAT('dispatcher-', UNIX_TIMESTAMP()), 'oauth', NOW(), NOW(), NOW());

SET @dispatcherId = LAST_INSERT_ID();

-- 3. Create Driver
INSERT INTO users (name, email, role, openId, loginMethod, fleetType, commissionPercent, createdAt, updatedAt, lastSignedIn)
VALUES ('Test Driver', 'driver@test.com', 'driver', CONCAT('driver-', UNIX_TIMESTAMP()), 'oauth', 'internal', '0.00', NOW(), NOW(), NOW());

SET @driverId = LAST_INSERT_ID();

-- 4. Create Wallet
INSERT INTO wallets (driverId, totalEarnings, availableBalance, pendingBalance, blockedBalance, minimumWithdrawalAmount, withdrawalFeePercent, createdAt, updatedAt)
VALUES (@driverId, 5000, 3000, 1500, 500, 100, 2.5, NOW(), NOW());

SET @walletId = LAST_INSERT_ID();

-- 5. Create Wallet Transactions
INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
VALUES (@walletId, @driverId, 'load_payment', 1500, 'Load payment', 'completed', NOW());

INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
VALUES (@walletId, @driverId, 'load_payment', 1200, 'Load payment', 'completed', NOW());

INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
VALUES (@walletId, @driverId, 'adjustment', -200, 'Adjustment', 'completed', NOW());

-- 6. Create Loads
INSERT INTO loads (clientName, pickupAddress, deliveryAddress, weight, weightUnit, merchandiseType, price, status, createdAt, updatedAt)
VALUES ('Test Client A', 'Atlanta, GA', 'Charlotte, NC', 10000, 'lbs', 'General Cargo', 625, 'available', NOW(), NOW());

SET @loadId1 = LAST_INSERT_ID();

INSERT INTO loads (clientName, pickupAddress, deliveryAddress, weight, weightUnit, merchandiseType, price, status, createdAt, updatedAt)
VALUES ('Test Client B', 'Nashville, TN', 'Memphis, TN', 8000, 'lbs', 'General Cargo', 360, 'available', NOW(), NOW());

SET @loadId2 = LAST_INSERT_ID();

INSERT INTO loads (clientName, pickupAddress, deliveryAddress, weight, weightUnit, merchandiseType, price, status, createdAt, updatedAt)
VALUES ('Test Client C', 'Louisville, KY', 'Indianapolis, IN', 6000, 'lbs', 'General Cargo', 264, 'available', NOW(), NOW());

SET @loadId3 = LAST_INSERT_ID();

-- 7. Create Quote Analyses (only required columns)
INSERT INTO quote_analysis (loadId, brokerName, totalMiles, loadedMiles, baseRate, totalIncome, estimatedFuel, totalEstimatedCost, estimatedProfit, estimatedMargin, ratePerLoadedMile, recommendedMinimumRate, rateVsMinimum, verdict)
VALUES (@loadId1, 'Test Broker A', 250, 200, 625, 625, 150, 400, 225, 36, 3.125, 2.5, 0.625, 'accept');

INSERT INTO quote_analysis (loadId, brokerName, totalMiles, loadedMiles, baseRate, totalIncome, estimatedFuel, totalEstimatedCost, estimatedProfit, estimatedMargin, ratePerLoadedMile, recommendedMinimumRate, rateVsMinimum, verdict)
VALUES (@loadId2, 'Test Broker B', 180, 150, 360, 360, 120, 300, 60, 16.67, 2.4, 2.8, -0.4, 'reject');

-- 8. Create Settlement
INSERT INTO settlements (settlementPeriod, startDate, endDate, partner1Id, partner2Id, partner1Share, partner2Share, status, createdAt, updatedAt)
VALUES ('2026-04', '2026-04-01', '2026-04-30', @adminId, @dispatcherId, 50, 50, 'draft', NOW(), NOW());

SET @settlementId = LAST_INSERT_ID();

-- 9. Create Invoice
INSERT INTO invoices (invoiceNumber, loadId, driverId, brokerName, amount, status, dueDate, issuedDate)
VALUES (CONCAT('INV-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', FLOOR(RAND() * 10000)), @loadId1, @driverId, 'Test Broker A', 675, 'sent', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW());

SET @invoiceId = LAST_INSERT_ID();

-- 10. Create Alerts
INSERT INTO alerts (type, title, message, severity, recipientUserId, isRead, isAcknowledged, createdAt)
VALUES ('payment_pending', 'Payment Pending', CONCAT('Load #', @loadId1, ' payment pending'), 'info', @driverId, false, false, NOW());

INSERT INTO alerts (type, title, message, severity, recipientUserId, isRead, isAcknowledged, createdAt)
VALUES ('wallet_low', 'Wallet Balance Low', 'Your wallet balance is below minimum threshold', 'warning', @driverId, false, false, NOW());

-- Summary
SELECT CONCAT('✅ Seed data created successfully!
Company ID: ', @companyId, '
Admin ID: ', @adminId, '
Dispatcher ID: ', @dispatcherId, '
Driver ID: ', @driverId, '
Wallet ID: ', @walletId, '
Loads: ', @loadId1, ', ', @loadId2, ', ', @loadId3, '
Settlement ID: ', @settlementId, '
Invoice ID: ', @invoiceId) AS Result;
