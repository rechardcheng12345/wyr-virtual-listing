USE virtual_listing;

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
