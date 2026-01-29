import { NextResponse } from "next/server";
import { recordServerError } from "@/lib/errorReporting";

type ErrorBody = {
  message: string;
  error: string;
  details?: unknown;
};

export function jsonError(message: string, status = 500, details?: unknown) {
  if (status >= 500) {
    const stack =
      details && typeof details === "object" && details !== null && "stack" in details
        ? String((details as { stack?: unknown }).stack)
        : undefined;

    const detailText =
      details === undefined
        ? undefined
        : typeof details === "string"
          ? details
          : JSON.stringify(details);

    try {
      void recordServerError({
        route: null,
        status,
        message,
        details: detailText ?? null,
        stack: stack ?? null,
      });
    } catch {
      // best-effort only
    }
  }

  const body: ErrorBody = {
    message,
    error: message,
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(body, { status });
}

export function jsonUnauthorized(message = "Nicht autorisiert") {
  return jsonError(message, 401);
}

export function jsonBadRequest(message: string, details?: unknown) {
  return jsonError(message, 400, details);
}

export function jsonServerError(message: string, error: unknown) {
  const details =
    process.env.NODE_ENV !== "production"
      ? error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: error }
      : undefined;

  return jsonError(message, 500, details);
}
