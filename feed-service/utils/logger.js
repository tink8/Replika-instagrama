module.exports = {
  info(message, meta) {
    console.log(message, meta || "");
  },
  error(message, meta) {
    console.error(message, meta || "");
  }
};
