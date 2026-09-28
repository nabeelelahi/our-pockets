/**
 * Errors whose `message` is safe to show to end users.
 * Anything that is not an AppError is treated as an internal error and
 * replaced by a generic message before it reaches the client.
 */
export class AppError extends Error {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.fieldErrors = fieldErrors;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "This item no longer exists.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You are not authorized to access this household.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please log in to continue.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}
