USE nexus_db;

DROP PROCEDURE IF EXISTS withdraw_funds;

DELIMITER //

-- withdraw_funds: debits a user's wallet with the given amount.
-- Uses SELECT FOR UPDATE to lock the wallet before reading balance,
-- preventing concurrent withdrawals from causing a negative balance.
-- Inserts a DEBIT entry into ledger_entries with NULL trade_id.
CREATE PROCEDURE withdraw_funds(
    IN p_user_id INT,
    IN p_amount  DECIMAL(15, 2)
)
BEGIN
    DECLARE v_balance DECIMAL(15, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_AMOUNT';
    END IF;

    START TRANSACTION;

    -- Lock wallet row before reading balance (prevents race conditions)
    SELECT balance INTO v_balance
        FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
    END IF;

    UPDATE wallets SET balance = balance - p_amount WHERE user_id = p_user_id;

    -- Record withdrawal as standalone ledger entry (no trade_id)
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
        VALUES (NULL, p_user_id, 'DEBIT', p_amount, NULL);

    COMMIT;

    SELECT (SELECT balance FROM wallets WHERE user_id = p_user_id) AS newBalance;
END //

DELIMITER ;
