USE nexus_db;

-- running_balance_view: Uses SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at)
-- to compute a running wallet balance for each user across every ledger event.
-- Note: entry_type 'CREDIT' increases balance, 'DEBIT' decreases balance.
CREATE OR REPLACE VIEW running_balance_view AS
SELECT
    id AS ledger_id,
    user_id,
    trade_id,
    entry_type,
    amount,
    created_at,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END)
        OVER (PARTITION BY user_id ORDER BY created_at, id) AS running_balance
FROM
    ledger_entries;
