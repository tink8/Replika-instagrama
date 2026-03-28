const { v4: uuidv4 } = require("uuid");
const path = require("path");
const minioClient = require("../config/minio");
const env = require("../config/env");

exports.uploadFile = async (file) => {
  // Determine extension from original file or fallback based on mimetype
  const ext =
    path.extname(file.originalname) ||
    (file.mimetype.startsWith("video/") ? ".mp4" : ".jpg");
  const fileName = `${uuidv4()}${ext}`;

  await minioClient.putObject(
    env.minioBucket,
    fileName,
    file.buffer,
    file.size,
    {
      "Content-Type": file.mimetype,
    },
  );

  // Return the relative URL path to the file
  return `/${env.minioBucket}/${fileName}`;
};

exports.deleteFile = async (mediaUrl) => {
  // Extract just the filename from the URL (e.g., /post-media/123.jpg -> 123.jpg)
  const fileName = mediaUrl.split("/").pop();
  if (fileName) {
    await minioClient.removeObject(env.minioBucket, fileName);
  }
};
