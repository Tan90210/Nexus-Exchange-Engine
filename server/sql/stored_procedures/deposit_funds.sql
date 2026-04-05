USE nexus_db;

DROP PROCEDURE IF EXISTS deposit_funds;

DELIMITER //

-- deposit_funds: credits a user's wallet with the given amount.
-- Inserts a CREDIT entry into ledger_entries with NULL trade_id
-- to represent a standalone deposit event (not linked to a trade).
CREATE PROCEDURE deposit_funds(
    IN p_user_id INT,
    IN p_amount  DECIMAL(15, 2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_AMOUNT';
    END IF;

    START TRANSACTION;

    -- Verify user exists and lock the wallet row
    SELECT id FROM users WHERE id = p_user_id FOR UPDATE;
    UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id;

    -- Record deposit as a standalone ledger entry (no trade_id)
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
        VALUES (NULL, p_user_id, 'CREDIT', p_amount, NULL);

    COMMIT;

    SELECT (SELECT balance FROM wallets WHERE user_id = p_user_id) AS newBalance;
END //

DELIMITER ;
