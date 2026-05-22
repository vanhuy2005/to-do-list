import mongoose from "mongoose";
import User from "../../to-do-list/backend/src/models/User.js";

describe("User Schema Validation Rules", () => {
  it("should validate successfully for a local user with passwordHash", () => {
    const user = new User({
      email: "localuser@example.com",
      displayName: "Local User",
      providers: ["local"],
      passwordHash: "bcrypt_hashed_password"
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();
  });

  it("should fail validation for a local user without passwordHash", () => {
    const user = new User({
      email: "localuser@example.com",
      displayName: "Local User",
      providers: ["local"]
      // missing passwordHash
    });

    const validationError = user.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError.errors.passwordHash).toBeDefined();
    expect(validationError.errors.passwordHash.message).toContain("required");
  });

  it("should validate successfully for a Google OAuth user without passwordHash", () => {
    const user = new User({
      email: "googleuser@example.com",
      displayName: "Google User",
      providers: ["google"]
      // no passwordHash
    });

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();
  });

  it("should validate successfully when updating notificationPreferences on a Google user", () => {
    const user = new User({
      email: "googleuser@example.com",
      displayName: "Google User",
      providers: ["google"]
    });

    // Simulate partial document validation (like during updates)
    user.notificationPreferences = {
      emailOverdue: false,
      emailDigest: true,
      digestHour: 10,
      timezone: "Asia/Ho_Chi_Minh"
    };

    const validationError = user.validateSync();
    expect(validationError).toBeUndefined();
  });
});
