const multer = require("multer");
const ApiError = require("../utils/ApiError");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "INVALID_MEDIA_TYPE",
        "Only image and video files are allowed",
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 20, // Max 20 files per request
  },
  fileFilter,
});

// Wrapper to catch Multer-specific errors and format them into our ApiError contract
const uploadMiddleware = (req, res, next) => {
  const uploadArray = upload.array("media", 20);

  uploadArray(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new ApiError(400, "FILE_TOO_LARGE", "A file exceeds the 50MB limit"),
        );
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return next(
          new ApiError(400, "TOO_MANY_FILES", "Maximum of 20 files allowed"),
        );
      }
      return next(new ApiError(400, "UPLOAD_ERROR", err.message));
    } else if (err) {
      return next(err); // Will be caught by the global error handler
    }
    next();
  });
};

module.exports = uploadMiddleware;
