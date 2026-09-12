
CREATE TABLE IF NOT EXISTS issued_keys (
  id            INT           NOT NULL AUTO_INCREMENT,
  company       VARCHAR(255)  NOT NULL,
  invoice       VARCHAR(100)  NOT NULL,
  hardware_id   VARCHAR(100)  NOT NULL,
  expiry_date   VARCHAR(8)    NOT NULL,
  output_key    VARCHAR(64)   NOT NULL,
  issued_by     VARCHAR(100)  DEFAULT NULL,
  issued_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_issued_keys_company (company),
  KEY idx_issued_keys_invoice (invoice)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
