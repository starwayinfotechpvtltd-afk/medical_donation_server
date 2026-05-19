-- Migration: remove campaign-based donations table and keep transaction-only donations flow
-- Date: 2026-05-19

START TRANSACTION;

-- Drop FK/index on transactions.donation_id if present
SET @drop_idx := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'transactions'
        AND index_name = 'idx_txn_donation'
    ),
    'ALTER TABLE transactions DROP INDEX idx_txn_donation',
    'SELECT 1'
  )
);
PREPARE stmt_drop_idx FROM @drop_idx;
EXECUTE stmt_drop_idx;
DEALLOCATE PREPARE stmt_drop_idx;

SET @drop_col := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'transactions'
        AND column_name = 'donation_id'
    ),
    'ALTER TABLE transactions DROP COLUMN donation_id',
    'SELECT 1'
  )
);
PREPARE stmt_drop_col FROM @drop_col;
EXECUTE stmt_drop_col;
DEALLOCATE PREPARE stmt_drop_col;

-- Drop donations table if present
SET @drop_table := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'donations'
    ),
    'DROP TABLE donations',
    'SELECT 1'
  )
);
PREPARE stmt_drop_table FROM @drop_table;
EXECUTE stmt_drop_table;
DEALLOCATE PREPARE stmt_drop_table;

COMMIT;
