-- Card Copy Program: approved clone-card orders.
-- Replaces the desktop app's local approved_orders.json store.
-- Apply by hand: mysql -u root -p virtual_listing < migrations/2026-09-13-card-copy.sql

CREATE TABLE IF NOT EXISTS card_copy_orders (
  id                INT           NOT NULL AUTO_INCREMENT,
  order_id          VARCHAR(100)  NOT NULL,
  data_a            TEXT          DEFAULT NULL,   -- Reserved memory (Bank 0)
  data_b            TEXT          DEFAULT NULL,   -- EPC memory (Bank 1)
  data_c            TEXT          DEFAULT NULL,   -- TID memory (Bank 2)
  data_d            TEXT          DEFAULT NULL,   -- User memory (Bank 3)
  data_e            VARCHAR(100)  DEFAULT NULL,   -- client-supplied datetime string
  verification_hash VARCHAR(64)   NOT NULL,
  status            VARCHAR(20)   NOT NULL DEFAULT 'Approved',
  tag_class         VARCHAR(100)  DEFAULT NULL,
  vendor            VARCHAR(100)  DEFAULT NULL,
  tag_family        VARCHAR(100)  DEFAULT NULL,
  tag_model         VARCHAR(150)  DEFAULT NULL,
  model_notes       TEXT          DEFAULT NULL,
  remark            TEXT          DEFAULT NULL,
  approved_time     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_time     TIMESTAMP     NULL DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- The desktop app upserts by Order ID; keep that single-record-per-order rule.
  UNIQUE KEY uq_card_copy_order_id (order_id),
  KEY idx_card_copy_approved_time (approved_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
