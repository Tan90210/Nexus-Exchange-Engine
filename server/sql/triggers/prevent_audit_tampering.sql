USE nexus_db;

DELIMITER //

DROP TRIGGER IF EXISTS prevent_audit_tampering//

-- prevent_audit_tampering: fires BEFORE any UPDATE or DELETE on audit_log.
-- Immediately raises SQLSTATE '45000' to block the operation, making the
-- audit_log truly write-once at the database level regardless of the caller.
CREATE TRIGGER prevent_audit_tampering_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Audit log is immutable: UPDATE not permitted';
END //

CREATE TRIGGER prevent_audit_tampering_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Audit log is immutable: DELETE not permitted';
END //

DELIMITER ;
