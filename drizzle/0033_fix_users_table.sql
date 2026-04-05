-- Migration: Add missing user fields to fix login
-- This migration adds 14 critical fields that the application expects

ALTER TABLE `users`
ADD COLUMN `passwordHash` VARCHAR(255),
ADD COLUMN `loginMethod` VARCHAR(50) DEFAULT 'email',
ADD COLUMN `phone` VARCHAR(50),
ADD COLUMN `address` VARCHAR(255),
ADD COLUMN `city` VARCHAR(100),
ADD COLUMN `state` VARCHAR(100),
ADD COLUMN `zipCode` VARCHAR(20),
ADD COLUMN `profileImageUrl` TEXT,
ADD COLUMN `bio` TEXT,
ADD COLUMN `fleetType` VARCHAR(50),
ADD COLUMN `commissionPercent` DECIMAL(5,2),
ADD COLUMN `dotNumber` VARCHAR(50),
ADD COLUMN `vehicleInfo` TEXT,
ADD COLUMN `licenseUrl` TEXT,
ADD COLUMN `insuranceUrl` TEXT,
ADD COLUMN `leaseContractUrl` TEXT,
ADD COLUMN `locationSharingEnabled` BOOLEAN DEFAULT FALSE,
ADD COLUMN `lastSignedIn` TIMESTAMP;
