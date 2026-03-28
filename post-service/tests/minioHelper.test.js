const minioHelper = require("../utils/minioHelper");
const minioClient = require("../config/minio");
const env = require("../config/env");

jest.mock("../config/minio", () => ({
  putObject: jest.fn(),
  removeObject: jest.fn(),
}));

describe("MinIO Helper", () => {
  it("should upload a file and return the formatted URL", async () => {
    const mockFile = {
      originalname: "test.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("test"),
      size: 4,
    };

    minioClient.putObject.mockResolvedValue();

    const url = await minioHelper.uploadFile(mockFile);

    expect(minioClient.putObject).toHaveBeenCalled();
    expect(url).toMatch(new RegExp(`^/${env.minioBucket}/[a-f0-9\\-]+\\.jpg$`));
  });

  it("should delete a file by extracting the filename from the URL", async () => {
    minioClient.removeObject.mockResolvedValue();

    await minioHelper.deleteFile("/post-media/1234-5678.jpg");

    expect(minioClient.removeObject).toHaveBeenCalledWith(
      env.minioBucket,
      "1234-5678.jpg",
    );
  });
});
