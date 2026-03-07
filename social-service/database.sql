CREATE TABLE blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_id INT,
    blocked_id INT
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50),
    from_user INT,
    to_user INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);