-- Add "login" to password_audit_log action enum
ALTER TABLE `password_audit_log` MODIFY COLUMN `action` ENUM('changed','reset','created','login') NOT NULL;
