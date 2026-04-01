export type RegisterFieldName =
  | "companyName"
  | "fullName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword";

export interface RegisterErrorMapping {
  fieldErrors: Partial<Record<RegisterFieldName, string>>;
  formErrors: string[];
}

function splitMessage(message: string): string[] {
  const normalized = message
    // Nest validation messages sometimes arrive as one concatenated line.
    .replace(/(property\s+\w+\s+should not exist)/gi, "\n$1")
    .replace(
      /\b(fullname|companyname|businessname|ownername|slug|email|phone|password)\b/gi,
      "\n$&",
    );

  return normalized
    .split(/\r?\n|,(?=\s*(?:property|[a-zA-Z]))/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Parses backend message payloads into a normalized list:
 * - string
 * - string[]
 * - nested { message, details }
 */
export function extractBackendMessages(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.flatMap((item) => extractBackendMessages(item));
  }

  if (typeof input === "string") {
    return splitMessage(input);
  }

  if (typeof input === "object") {
    const source = input as Record<string, unknown>;
    const direct = source.message ? extractBackendMessages(source.message) : [];
    const details = source.details ? extractBackendMessages(source.details) : [];

    if (direct.length > 0 || details.length > 0) {
      return [...direct, ...details];
    }
  }

  return [];
}

/**
 * Maps known registration validation messages to form fields.
 * Unknown messages are returned as form-level errors.
 */
export function mapRegisterBackendErrors(messages: string[]): RegisterErrorMapping {
  const fieldErrors: RegisterErrorMapping["fieldErrors"] = {};
  const formErrors: string[] = [];

  for (const message of messages) {
    const normalized = message.toLowerCase();

    if (normalized.includes("property businessname should not exist")) {
      fieldErrors.companyName ??= message;
      continue;
    }

    if (normalized.includes("property ownername should not exist")) {
      fieldErrors.fullName ??= message;
      continue;
    }

    if (normalized.includes("property slug should not exist")) {
      formErrors.push(message);
      continue;
    }

    if (
      normalized.includes("email") &&
      (normalized.includes("exists") || normalized.includes("registered"))
    ) {
      fieldErrors.email ??= message;
      continue;
    }

    if (normalized.includes("fullname") || normalized.includes("ownername")) {
      fieldErrors.fullName ??= message;
      continue;
    }

    if (normalized.includes("companyname") || normalized.includes("businessname")) {
      fieldErrors.companyName ??= message;
      continue;
    }

    if (normalized.includes("phone")) {
      fieldErrors.phone ??= message;
      continue;
    }

    if (normalized.includes("password")) {
      fieldErrors.password ??= message;
      continue;
    }

    if (normalized.includes("confirm") && normalized.includes("password")) {
      fieldErrors.confirmPassword ??= message;
      continue;
    }

    formErrors.push(message);
  }

  return { fieldErrors, formErrors };
}
