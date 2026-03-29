CREATE DATABASE IF NOT EXISTS interaction_db;
USE interaction_db;

CREATE TABLE IF NOT EXISTS likes (
    id VARCHAR(255) PRIMARY KEY,
    postId VARCHAR(255) NOT NULL,
    postOwnerId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_likes_post_user UNIQUE (postId, userId)
);

CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    postId VARCHAR(255) NOT NULL,
    postOwnerId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_likes_postId ON likes(postId);
CREATE INDEX idx_likes_postOwnerId_userId ON likes(postOwnerId, userId);
CREATE INDEX idx_comments_postId_createdAt ON comments(postId, createdAt);
CREATE INDEX idx_comments_postOwnerId_userId ON comments(postOwnerId, userId);
