import type { ApiResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      // A FormData body must NOT have an explicit Content-Type - the
      // browser sets one itself with the correct multipart boundary.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.success === false) {
    const message = payload?.message ?? response.statusText ?? "Request failed";
    const code = payload && "code" in payload ? payload.code : "UNKNOWN_ERROR";
    throw new ApiError(message, code, response.status);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: formData }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
