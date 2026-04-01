const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
});
