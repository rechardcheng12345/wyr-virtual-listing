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
  created_date  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
