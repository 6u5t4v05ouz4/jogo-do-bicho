export type BetScope = "head" | "1to5";

export type BetInput =
  | { type: "grupo"; value: number; scope?: BetScope }
  | { type: "dezena"; value: string | number; scope?: BetScope }
  | { type: "centena"; value: string | number; scope?: BetScope }
  | { type: "milhar"; value: string | number; scope?: BetScope }
  | {
      type: "duque_grupo";
      value: [number, number] | number[];
      scope?: BetScope;
    }
  | {
      type: "terno_grupo";
      value: [number, number, number] | number[];
      scope?: BetScope;
    }
  | { type: "milhar_invertida"; value: string | number; scope?: BetScope };

export interface DrawResponse {
  ok: boolean;
  config: { unique: boolean };
  data: {
    draw: {
      first: string;
      second: string;
      third: string;
      fourth: string;
      fifth: string;
      createdAt: string;
    };
    drawId?: string;
    parsed: {
      first: ParsedNumber;
      second: ParsedNumber;
      third: ParsedNumber;
      fourth: ParsedNumber;
      fifth: ParsedNumber;
    };
  };
}

export interface PersistedDrawHistoryItem {
  id: string;
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  seed: string | null;
  createdAt: string;
  parsed: {
    first: ParsedNumber;
    second: ParsedNumber;
    third: ParsedNumber;
    fourth: ParsedNumber;
    fifth: ParsedNumber;
  };
}

export interface DrawHistoryResponse {
  ok: boolean;
  data: PersistedDrawHistoryItem[];
}

export interface ParsedNumber {
  input: string;
  milhar: string;
  centena: string;
  dezena: string;
  grupo: number;
  animal: string;
}

export interface ParseResponse {
  ok: boolean;
  data: ParsedNumber;
  rule: {
    formula: string;
  };
}

export interface CheckBetResponse {
  ok: boolean;
  data: {
    bet: BetInput;
    draw: {
      prizes: [string, string, string, string, string];
    };
    result: {
      isWin: boolean;
      matches: number[];
      meta?: {
        requiredGroups?: number[];
      };
    };
    persisted?: {
      drawId: string;
      betId: string;
      betResultId: string;
    } | null;
  };
}

export interface PersistedBetHistoryItem {
  id: string;
  createdAt: string;
  isWin: boolean;
  prizePoints: number;
  matchDetail: unknown;
  bet: {
    id: string;
    type: string;
    scope: string;
    value: unknown;
    pointsStaked: number;
    createdAt: string;
  };
  draw: {
    id: string;
    first: string;
    second: string;
    third: string;
    fourth: string;
    fifth: string;
    createdAt: string;
  };
}

export interface BetHistoryResponse {
  ok: boolean;
  data: PersistedBetHistoryItem[];
}

export interface ApiErrorPayload {
  ok?: false;
  error?: string;
  details?: unknown;
  message?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  public status: number;
  public payload: ApiErrorPayload | undefined;

  constructor(message: string, status = 500, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }

  return "http://localhost:3000";
}

const BASE_URL = resolveBaseUrl();

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined;

  if (!headers.has("Content-Type") && hasBody) {
    headers.set("Content-Type", "application/json");
  }

  const { body: _rawBody, ...restOptions } = options;

  const requestInit: RequestInit = {
    ...restOptions,
    headers,
  };

  if (hasBody) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, requestInit);

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const maybePayload = (payload ?? {}) as ApiErrorPayload;
    const message =
      maybePayload?.error ??
      maybePayload?.message ??
      `Request failed (${response.status})`;

    throw new ApiError(message, response.status, maybePayload);
  }

  return payload as T;
}

export const api = {
  baseUrl: BASE_URL,

  health() {
    return request<{
      ok: boolean;
      service: string;
      now?: string;
      uptimeSeconds?: number;
    }>("/health", { method: "GET" });
  },

  parseNumber(number: string | number) {
    const value = String(number).trim();
    return request<ParseResponse>(`/parse/${encodeURIComponent(value)}`, {
      method: "GET",
    });
  },

  draw(params?: { unique?: boolean }) {
    const unique = params?.unique ? "true" : "false";
    return request<DrawResponse>(`/draw?unique=${unique}`, {
      method: "GET",
    });
  },

  drawHistory(params?: { limit?: number }) {
    const limit = params?.limit ?? 20;
    return request<DrawHistoryResponse>(`/history/draws?limit=${limit}`, {
      method: "GET",
    });
  },

  checkBet(input: {
    bet: BetInput;
    draw?: { prizes: [string, string, string, string, string] };
    persist?: boolean;
  }) {
    return request<CheckBetResponse>("/bets/check", {
      method: "POST",
      body: input,
    });
  },

  betHistory(params?: { limit?: number }) {
    const limit = params?.limit ?? 20;
    return request<BetHistoryResponse>(`/history/bets?limit=${limit}`, {
      method: "GET",
    });
  },
};

export default api;
