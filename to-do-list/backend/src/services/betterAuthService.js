import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { fromNodeHeaders } from "better-auth/node";

import User from "../models/User.js";

const BETTER_AUTH_BASE_PATH = "/api/v1/auth/core";
const DEFAULT_APP_URL = "http://localhost:5173";
const DEFAULT_API_URL = `http://localhost:${process.env.PORT || 5001}`;

const PROVIDER_ALIASES = {
  credential: "local",
};

let authInstance = null;

const normalizeOriginURL = (value) => {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return String(value || "").replace(/\/+$/, "");
  }
};

const getBaseURL = () => {
  const rawURL =
    process.env.BETTER_AUTH_URL ||
    process.env.API_URL ||
    DEFAULT_API_URL;

  return normalizeOriginURL(rawURL);
};

const getFrontendURL = () => {
  return process.env.APP_URL || DEFAULT_APP_URL;
};

const parseCsv = (value) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getTrustedOrigins = () => {
  const origins = new Set([
    getFrontendURL(),
    ...parseCsv(process.env.CORS_ORIGIN),
    ...parseCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ]);

  return [...origins].filter(Boolean);
};


const normalizeProviderId = (providerId) => {
  return PROVIDER_ALIASES[providerId] || providerId;
};

const uniqueProviders = (providers = []) => {
  return [...new Set(providers.filter(Boolean))];
};

const updateUserProviders = async (auth, userId) => {
  const ctx = await auth.$context;
  const accounts = await ctx.internalAdapter.findAccounts(String(userId));
  const providers = uniqueProviders(accounts.map((account) => normalizeProviderId(account.providerId)));

  await User.findByIdAndUpdate(userId, {
    $set: {
      providers,
    },
  });
};

const buildAuth = () => {
  if (!mongoose.connection.db) {
    throw new Error("Better Auth cannot initialize before MongoDB is connected.");
  }

  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET;

  const auth = betterAuth({
    secret,
    baseURL: getBaseURL(),
    basePath: BETTER_AUTH_BASE_PATH,
    trustedOrigins: getTrustedOrigins(),
    database: mongodbAdapter(mongoose.connection.db, {
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: {
        hash: async (password) => bcrypt.hash(password, 10),
        verify: async ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            accessType: "offline",
            prompt: "select_account",
          },
        }
      : {},
    session: {
      modelName: "better_auth_sessions",
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: "better_auth_accounts",
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
      },
    },
    verification: {
      modelName: "better_auth_verifications",
    },
    user: {
      modelName: "users",
      fields: {
        name: "displayName",
        image: "avatarUrl",
      },
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
        status: {
          type: "string",
          required: true,
          defaultValue: "active",
          input: false,
        },
        preferredLanguage: {
          type: "string",
          required: true,
          defaultValue: "vi",
        },
        themePreference: {
          type: "string",
          required: true,
          defaultValue: "light",
        },
        customStatuses: {
          type: "string[]",
          required: false,
          defaultValue: () => [],
        },
        providers: {
          type: "string[]",
          required: false,
          defaultValue: () => [],
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    databaseHooks: {
      account: {
        create: {
          after: async (account) => {
            if (account.providerId === "credential" && account.password) {
              await User.findByIdAndUpdate(account.userId, {
                $set: {
                  passwordHash: account.password,
                },
              });
            }

            await updateUserProviders(auth, account.userId);
          },
        },
        update: {
          after: async (account) => {
            if (account.providerId === "credential" && account.password) {
              await User.findByIdAndUpdate(account.userId, {
                $set: {
                  passwordHash: account.password,
                },
              });
            }

            await updateUserProviders(auth, account.userId);
          },
        },
        delete: {
          after: async (account) => {
            await updateUserProviders(auth, account.userId);
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await User.findByIdAndUpdate(session.userId, {
              $set: {
                lastOnlineAt: new Date(),
              },
            });
          },
        },
      },
    },
    plugins: [],
  });

  return auth;
};

export const getBetterAuth = () => {
  if (!authInstance) {
    authInstance = buildAuth();
  }

  return authInstance;
};

export const toBetterAuthHeaders = (req) => {
  return fromNodeHeaders(req.headers);
};

export const applyBetterAuthHeaders = (res, headers) => {
  if (!headers) {
    return;
  }

  const setCookies =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];

  if (setCookies.length > 0) {
    res.setHeader("Set-Cookie", setCookies);
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }

    res.setHeader(key, value);
  });
};

export const getOAuthSuccessURL = () => {
  return `${getFrontendURL()}/login?oauth=success`;
};

export const getOAuthErrorURL = () => {
  return `${getFrontendURL()}/login?oauth=error`;
};

export const getOAuthLinkSuccessURL = () => {
  return `${getFrontendURL()}/settings?oauth=success`;
};

export const getOAuthLinkErrorURL = () => {
  return `${getFrontendURL()}/settings?oauth=error`;
};


export const syncLegacyCredentialAccount = async (user) => {
  if (!user?.email || !user?.passwordHash) {
    return false;
  }

  const auth = getBetterAuth();
  const ctx = await auth.$context;
  const betterAuthUser = await ctx.internalAdapter.findUserByEmail(user.email, {
    includeAccounts: true,
  });

  if (!betterAuthUser?.user) {
    return false;
  }

  const hasCredentialAccount = betterAuthUser.accounts.some(
    (account) => account.providerId === "credential",
  );

  if (!hasCredentialAccount) {
    await ctx.internalAdapter.linkAccount({
      userId: betterAuthUser.user.id,
      providerId: "credential",
      accountId: betterAuthUser.user.id,
      password: user.passwordHash,
    });
  }

  await updateUserProviders(auth, user._id);
  return true;
};

export const fetchBetterAuthSession = async (headers) => {
  const auth = getBetterAuth();
  return auth.api.getSession({
    headers,
  });
};