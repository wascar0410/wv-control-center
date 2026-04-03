-- Migration: Add fleet type and driver classification fields to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `fleetType` ENUM('internal','leased','external') DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS `commissionPercent` DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `dotNumber` VARCHAR(20),
  ADD COLUMN IF NOT EXISTS `vehicleInfo` TEXT,
  ADD COLUMN IF NOT EXISTS `licenseUrl` TEXT,
  ADD COLUMN IF NOT EXISTS `insuranceUrl` TEXT,
  ADD COLUMN IF NOT EXISTS `leaseContractUrl` TEXT,
  ADD COLUMN IF NOT EXISTS `locationSharingEnabled` TINYINT(1) DEFAULT 0;
