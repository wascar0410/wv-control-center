-- Update reserve_transfer_suggestions status enum to include all states
ALTER TABLE reserve_transfer_suggestions
MODIFY COLUMN status ENUM(
  'suggested',
  'approved',
  'processing',
  'pending',
  'completed',
  'dismissed',
  'failed',
  'cancelled'
) NOT NULL DEFAULT 'suggested';
