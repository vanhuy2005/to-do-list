export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/../../tests/backend/**/*.test.js"],
  roots: ["<rootDir>", "<rootDir>/../../tests/backend"],
  moduleDirectories: ["node_modules", "<rootDir>/node_modules"],
  transformIgnorePatterns: [],
  clearMocks: true,
};
