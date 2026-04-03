USE nexus_db;

DELIMITER //

CREATE TRIGGER after_trade_insert
AFTER INSERT ON trades
FOR EACH ROW
BEGIN
    DECLARE v_hash VARCHAR(130);
    
    -- Generate SHA-512 hash based on trade details and asset price
    -- This simulates a WORM audit trail using cryptographic hashing
    SET v_hash = SHA2(CONCAT(
        NEW.id, '|', 
        NEW.asset_id, '|', 
        NEW.qty, '|', 
        NEW.executed_price, '|', 
        NEW.executed_at
    ), 512);

    INSERT INTO audit_log (trade_id, tx_hash)
    VALUES (NEW.id, v_hash);
END //

DELIMITER ;
