const axios = require("axios");

function createHttpClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: 7000
  });
}

module.exports = {
  createHttpClient
};
