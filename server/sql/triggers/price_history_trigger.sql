USE nexus_db;

DELIMITER //

DROP TRIGGER IF EXISTS price_history_trigger//

-- price_history_trigger: fires AFTER any UPDATE on the assets table where
-- current_price has actually changed. Automatically inserts a new price
-- snapshot into price_history, ensuring the price series is always
-- complete without relying on application-layer code to log it.
CREATE TRIGGER price_history_trigger
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
    IF NEW.current_price != OLD.current_price THEN
        INSERT INTO price_history (asset_id, price, recorded_at)
            VALUES (NEW.id, NEW.current_price, NOW());
    END IF;
END //

DELIMITER ;
