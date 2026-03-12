import { z } from "zod";

const STORAGE_KEY = "farfield.server-target.v1";
const DEFAULT_SERVER_PORT = 4311;
const MAX_SERVER_API_PASSWORD_LENGTH = 512;
const DEFAULT_SERVER_API_PASSWORD = "zxczxc";

const ServerProtocolSchema = z.enum(["http:", "https:"]);

const ServerBaseUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, ctx) => {
    const url = new URL(value);

    if (!ServerProtocolSchema.safeParse(url.protocol).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL must start with http:// or https://",
      });
    }

    if (url.pathname !== "/" && url.pathname.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL cannot include a path",
      });
    }

    if (url.search.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL cannot include a query string",
      });
    }

    if (url.hash.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL cannot include a hash fragment",
      });
    }
  })
  .transform((value) => {
    const url = new URL(value);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  });

const ServerApiPasswordSchema = z
  .string()
  .trim()
  .min(1, "Server API password cannot be empty")
  .max(
    MAX_SERVER_API_PASSWORD_LENGTH,
    `Server API password cannot exceed ${String(MAX_SERVER_API_PASSWORD_LENGTH)} characters`,
  );

const configuredServerBaseUrl = (() => {
  const configured = import.meta.env["VITE_FARFIELD_SERVER_URL"];
  if (typeof configured !== "string" || configured.trim().length === 0) {
    return null;
  }
  return ServerBaseUrlSchema.parse(configured);
})();

const StoredServerTargetV1Schema = z
  .object({
    version: z.literal(1),
    baseUrl: ServerBaseUrlSchema,
  })
  .strict();

const StoredServerTargetV2Schema = z
  .object({
    version: z.literal(2),
    baseUrl: ServerBaseUrlSchema,
    apiPassword: z.union([ServerApiPasswordSchema, z.null()]),
  })
  .strict();

const StoredServerTargetSchema = z
  .union([StoredServerTargetV1Schema, StoredServerTargetV2Schema])
  .transform((value) => {
    if (value.version === 1) {
      return {
        version: 2 as const,
        baseUrl: value.baseUrl,
        apiPassword: DEFAULT_SERVER_API_PASSWORD,
      };
    }
    if (value.apiPassword === null) {
      return {
        ...value,
        apiPassword: DEFAULT_SERVER_API_PASSWORD,
      };
    }
    return value;
  });

const StoredServerTargetTextSchema = z.string().transform((raw, ctx) => {
  try {
    return JSON.parse(raw);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Saved server target is not valid JSON",
    });
    return z.NEVER;
  }
});

const ApiPathSchema = z
  .string()
  .min(1, "API path is required")
  .regex(/^\//, "API path must start with '/'");

export type StoredServerTarget = z.infer<typeof StoredServerTargetSchema>;

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getDefaultServerBaseUrl(): string {
  if (configuredServerBaseUrl !== null) {
    return configuredServerBaseUrl;
  }

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${String(DEFAULT_SERVER_PORT)}`;
  }

  const hostname = window.location.hostname;

  if (isLocalHost(hostname)) {
    return `http://127.0.0.1:${String(DEFAULT_SERVER_PORT)}`;
  }

  return window.location.origin;
}

export function readStoredServerTarget(): StoredServerTarget | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return null;
  }

  const parsedJson = StoredServerTargetTextSchema.parse(raw);
  return StoredServerTargetSchema.parse(parsedJson);
}

export function parseServerBaseUrl(value: string): string {
  return ServerBaseUrlSchema.parse(value);
}

export function parseServerApiPassword(value: string): string {
  return ServerApiPasswordSchema.parse(value);
}

export function normalizeServerApiPassword(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return DEFAULT_SERVER_API_PASSWORD;
  }
  return parseServerApiPassword(trimmed);
}

export function saveServerTarget(
  value: string,
  apiPassword: string | null = null,
): StoredServerTarget {
  const parsedBaseUrl = parseServerBaseUrl(value);
  const parsedApiPassword =
    apiPassword === null
      ? DEFAULT_SERVER_API_PASSWORD
      : normalizeServerApiPassword(apiPassword);
  const next: StoredServerTarget = {
    version: 2,
    baseUrl: parsedBaseUrl,
    apiPassword: parsedApiPassword,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function saveServerBaseUrl(value: string): StoredServerTarget {
  const existing = readStoredServerTarget();
  return saveServerTarget(value, existing?.apiPassword ?? null);
}

export function clearStoredServerTarget(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function resolveServerBaseUrl(): string {
  const stored = readStoredServerTarget();
  if (stored) {
    return stored.baseUrl;
  }
  return getDefaultServerBaseUrl();
}

export function resolveServerApiPassword(): string | null {
  const stored = readStoredServerTarget();
  return stored?.apiPassword ?? DEFAULT_SERVER_API_PASSWORD;
}

export function buildServerUrl(path: string, baseUrlOverride?: string): string {
  const parsedPath = ApiPathSchema.parse(path);
  const baseUrl =
    typeof baseUrlOverride === "string"
      ? parseServerBaseUrl(baseUrlOverride)
      : resolveServerBaseUrl();
  return new URL(parsedPath, `${baseUrl}/`).toString();
}
