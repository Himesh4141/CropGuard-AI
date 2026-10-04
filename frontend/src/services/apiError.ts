import axios from "axios";

interface FastApiValidationError {
  type?: string;
  loc?: Array<string | number>;
  msg?: string;
  input?: unknown;
  ctx?: unknown;
}

interface BackendErrorResponse {
  detail?:
    | string
    | FastApiValidationError[]
    | Record<string, unknown>;

  message?: string;
  code?: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor({
    message,
    status,
    code,
    details,
  }: {
    message: string;
    status: number;
    code: string;
    details?: unknown;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function formatValidationError(
  error: FastApiValidationError,
): string {
  const field =
    error.loc
      ?.filter((item) => item !== "body")
      .join(".") ?? "";

  const message =
    error.msg ??
    "Invalid value";

  if (!field) {
    return message;
  }

  return `${field}: ${message}`;
}

function extractErrorMessage(
  data: BackendErrorResponse | undefined,
  fallback: string,
): string {
  if (!data) {
    return fallback;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    const messages =
      data.detail
        .map((item) =>
          formatValidationError(item),
        )
        .filter((message) =>
          message.length > 0,
        );

    if (messages.length > 0) {
      return messages.join(" • ");
    }
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (
    data.detail &&
    typeof data.detail === "object"
  ) {
    try {
      return JSON.stringify(data.detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function normalizeApiError(
  error: unknown,
): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const responseData =
      error.response?.data as
        | BackendErrorResponse
        | undefined;

    const fallbackMessage =
      error.response
        ? `Request failed with status ${error.response.status}.`
        : "Unable to connect to the CropGuard API.";

    const message =
      extractErrorMessage(
        responseData,
        fallbackMessage,
      );

    return new ApiClientError({
      message,
      status:
        error.response?.status ?? 0,
      code:
        responseData?.code ??
        "API_REQUEST_FAILED",
      details:
        error.response?.data,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({
      message: error.message,
      status: 0,
      code: "UNKNOWN_ERROR",
    });
  }

  return new ApiClientError({
    message:
      "An unexpected error occurred.",
    status: 0,
    code: "UNKNOWN_ERROR",
  });
}
