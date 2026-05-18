-- Virtual Listing Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS virtual_listing
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE virtual_listing;

CREATE TABLE IF NOT EXISTS listings (
  id            INT           NOT NULL AUTO_INCREMENT,
  sku           VARCHAR(100)  NOT NULL,
  product_name  VARCHAR(255)  NOT NULL,
  product_format VARCHAR(100) DEFAULT NULL,
  url_link      TEXT          DEFAULT NULL,
  size          VARCHAR(50)   DEFAULT NULL,
  file_path     TEXT          DEFAULT NULL,
  remarks       TEXT          DEFAULT NULL,
  created_date  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Run this on existing databases to add the remarks column:
-- ALTER TABLE listings ADD COLUMN remarks TEXT DEFAULT NULL AFTER file_path;

CREATE TABLE IF NOT EXISTS users (
  id            INT           NOT NULL AUTO_INCREMENT,
  username      VARCHAR(100)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_date  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_history (
  id              INT           NOT NULL AUTO_INCREMENT,
  recipient_email VARCHAR(255)  NOT NULL,
  delivery_method VARCHAR(50)   NOT NULL DEFAULT 'presign_url',
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending',
  product_count   INT           NOT NULL DEFAULT 0,
  error_message   TEXT          DEFAULT NULL,
  sent_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_history_sent_at (sent_at),
  KEY idx_email_history_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_history_items (
  id            INT           NOT NULL AUTO_INCREMENT,
  history_id    INT           NOT NULL,
  listing_id    INT           DEFAULT NULL,
  sku           VARCHAR(100)  DEFAULT NULL,
  product_name  VARCHAR(255)  NOT NULL,
  download_url  TEXT          DEFAULT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_history_items_history_id (history_id),
  CONSTRAINT fk_email_history_items_history
    FOREIGN KEY (history_id) REFERENCES email_history (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
