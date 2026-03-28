import * as Minio from "minio";
import { config } from "../config/env.js";

const minioClient = new Minio.Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export const initMinio = async () => {
  const bucketName = config.minio.bucketName;
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log(`MinIO bucket '${bucketName}' created successfully.`);

      // Set bucket policy to public read so avatars can be viewed directly
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Public read policy applied to bucket '${bucketName}'.`);
    } else {
      console.log(`MinIO bucket '${bucketName}' already exists.`);
    }
  } catch (error) {
    console.error("Error initializing MinIO:", error.message);
  }
};

export default minioClient;
