import { PostgrestError } from "@supabase/supabase-js";

// RLS error codes
const RLS_ERROR_CODES = ["PGRST301", "42501"];

export interface AppError {
  code: string;
  message: string;
  isRLSError: boolean;
}

export function isRLSError(error: unknown): boolean {
  if (!error) return false;

  // Check PostgrestError
  if (isPostgrestError(error)) {
    return RLS_ERROR_CODES.includes(error.code);
  }

  // Check generic error with code
  if (typeof error === "object" && "code" in error) {
    return RLS_ERROR_CODES.includes((error as { code: string }).code);
  }

  return false;
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "details" in error
  );
}

export function parseError(error: unknown): AppError {
  const isRLS = isRLSError(error);

  if (isPostgrestError(error)) {
    return {
      code: error.code,
      message: isRLS ? "Access denied" : error.message,
      isRLSError: isRLS,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: error.message,
      isRLSError: false,
    };
  }

  return {
    code: "UNKNOWN",
    message: "An unexpected error occurred",
    isRLSError: false,
  };
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.message;
}
