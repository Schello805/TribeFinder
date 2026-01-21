import { NextResponse } from "next/server";

type ErrorBody = {
  message: string;
  error: string;
  details?: unknown;
};

export function jsonError(message: string, status = 500, details?: unknown) {
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
