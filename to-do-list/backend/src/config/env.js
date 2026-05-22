import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_ENV = process.env.NODE_ENV || "development";
const envFile =
  NODE_ENV === "production"
    ? ".env.production"
    : NODE_ENV === "test"
      ? ".env.test"
      : ".env.development";

dotenv.config({
  path: path.resolve(__dirname, "../../", envFile),
  override: false,
});

export const validateProductionEnv = (env) => {
  if (env.NODE_ENV === "production") {
    if (!env.MONGODB_CONNECTIONSTRING) throw new Error("CRITICAL: MONGODB_CONNECTIONSTRING is missing.");
    if (!env.JWT_SECRET || !env.JWT_REFRESH_SECRET) throw new Error("CRITICAL: JWT secrets are missing.");
    if (!env.BETTER_AUTH_SECRET) throw new Error("CRITICAL: BETTER_AUTH_SECRET is missing.");
    
    // Validate email configuration if RESEND_API_KEY or EMAIL_FROM is present
    if (env.RESEND_API_KEY || env.EMAIL_FROM) {
      const emailFrom = env.EMAIL_FROM;
      if (!env.RESEND_API_KEY || !emailFrom) throw new Error("CRITICAL: RESEND_API_KEY or EMAIL_FROM is missing.");
      if (emailFrom.includes("onboarding@resend.dev")) {
        throw new Error("CRITICAL: EMAIL_FROM contains 'onboarding@resend.dev' in production environment.");
      }
      if (env.EMAIL_DEV_REDIRECT_TO_ADMIN === "true" || env.EMAIL_DEV_REDIRECT_TO_ADMIN === true) {
        throw new Error("CRITICAL: EMAIL_DEV_REDIRECT_TO_ADMIN cannot be enabled in production environment.");
      }
    }

    if (env.JWT_SECRET === "dev_access_secret_change_me" || env.JWT_REFRESH_SECRET === "dev_refresh_secret_change_me") {
      throw new Error("CRITICAL: Default dev JWT secrets must not be used in production.");
    }
  }
};

validateProductionEnv(process.env);
