const Minio = require("minio");
const env = require("./env");

const minioClient = new Minio.Client({
  endPoint: env.minioEndpoint,
  port: env.minioPort,
  useSSL: env.minioUseSSL,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey,
});

// Ensure the bucket exists on startup
const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(env.minioBucket);
    if (!exists) {
      await minioClient.makeBucket(env.minioBucket, "us-east-1");
      console.log(`MinIO Bucket '${env.minioBucket}' created successfully.`);
    } else {
      console.log(`MinIO Bucket '${env.minioBucket}' already exists.`);
    }
  } catch (err) {
    console.error("Error initializing MinIO bucket:", err);
  }
};

// Prevent this from running during Jest tests
if (process.env.NODE_ENV !== "test") {
  initMinio();
}

module.exports = minioClient;
