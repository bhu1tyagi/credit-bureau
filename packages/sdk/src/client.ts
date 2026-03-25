import type { CredBureauConfig, ApiError } from "./types";

export class HttpClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: CredBureauConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || "https://api.credbureau.xyz").replace(/\/$/, "");
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 2;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, value);
      }
    }
    return this.request<T>(url.toString(), { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const headers = {
      ...((init.headers as Record<string, string>) || {}),
      "X-API-Key": this.apiKey,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const apiError = (errorBody as { error?: ApiError }).error;
          throw new CredBureauError(
            apiError?.message || `HTTP ${response.status}`,
            apiError?.code || "HTTP_ERROR",
            response.status,
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;
        if (error instanceof CredBureauError && error.status < 500) {
          throw error; // Don't retry client errors
        }
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("Request failed");
  }
}

export class CredBureauError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "CredBureauError";
    this.code = code;
    this.status = status;
  }
}
