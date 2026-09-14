-- Card Copy Program: incoming tag reads submitted by the customer's reader
-- program. This is an inbox/log, separate from approved orders.
-- Apply by hand: mysql -u root -p virtual_listing < migrations/2026-09-14-card-copy-read-requests.sql

CREATE TABLE IF NOT EXISTS card_copy_read_requests (
  id                 INT           NOT NULL AUTO_INCREMENT,
  order_id           VARCHAR(100)  DEFAULT NULL,
  data_a             TEXT          DEFAULT NULL,   -- Reserved memory (Bank 0)
  data_b             TEXT          DEFAULT NULL,   -- EPC memory (Bank 1)
  data_c             TEXT          DEFAULT NULL,   -- TID memory (Bank 2)
  data_d             TEXT          DEFAULT NULL,   -- User memory (Bank 3)
  data_e             VARCHAR(100)  DEFAULT NULL,   -- client-supplied datetime string
  raw_text           TEXT          DEFAULT NULL,   -- original payload, if sent as text
  tag_class          VARCHAR(100)  DEFAULT NULL,
  vendor             VARCHAR(100)  DEFAULT NULL,
  tag_family         VARCHAR(100)  DEFAULT NULL,
  tag_model          VARCHAR(150)  DEFAULT NULL,
  model_notes        TEXT          DEFAULT NULL,
  is_valid           TINYINT(1)    NOT NULL DEFAULT 0,
  validation_message VARCHAR(255)  DEFAULT NULL,
  source             VARCHAR(100)  DEFAULT NULL,   -- optional client identifier
  client_ip          VARCHAR(45)   DEFAULT NULL,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_card_copy_read_requests_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
