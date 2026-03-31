CREATE DATABASE IF NOT EXISTS post_db;
USE post_db;

CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_media (
    id VARCHAR(255) PRIMARY KEY,
    postId VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    type VARCHAR(16) NOT NULL,
    orderIndex INT NOT NULL,
    objectKey VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_media_post
        FOREIGN KEY (postId) REFERENCES posts(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_posts_userId ON posts(userId);
CREATE INDEX idx_posts_createdAt ON posts(createdAt);
CREATE INDEX idx_post_media_postId_order ON post_media(postId, orderIndex);
