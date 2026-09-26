let csrfToken = "";
let accessToken = sessionStorage.getItem("schedule_access_token") || "";
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const setCsrf = (value: string) => {
  csrfToken = value;
};
export function setAccessToken(value: string) {
  accessToken = value;
  if (value) sessionStorage.setItem("schedule_access_token", value);
  else sessionStorage.removeItem("schedule_access_token");
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function serverFetch(path: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  const retryable = !options.method || options.method === "GET" || path === "/auth/login";
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/api${path}`, {
          ...options,
          signal: options.signal || controller.signal,
        });
        if (!retryable || ![502, 503, 504].includes(response.status) || attempt >= 5)
          return response;
        await response.body?.cancel();
      } catch (e) {
        if (controller.signal.aborted || (e as Error).name === "AbortError")
          throw new Error("The schedule server is taking longer than expected. Please try again.");
        if (!retryable || attempt >= 5)
          throw new Error(
            "Unable to reach the schedule server. Check your connection and try again.",
          );
      }
      await new Promise((r) => setTimeout(r, Math.min(2000 * 2 ** attempt, 16000)));
      if (controller.signal.aborted)
        throw new Error("The schedule server is taking longer than expected. Please try again.");
    }
  } finally {
    clearTimeout(timer);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") headers.set("X-CSRF-Token", csrfToken);
  const response = await serverFetch(path, { ...options, headers });
  if (!response.ok) {
    let message = "The request failed. Please try again.";
    try {
      const data = await response.json();
      message = Array.isArray(data.detail)
        ? data.detail
            .map((x: { loc: string[]; msg: string }) => `${x.loc.slice(1).join(" ")}: ${x.msg}`)
            .join("\n")
        : data.detail || message;
    } catch {
      /* A proxy may return a non-JSON error. */
    }
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me")
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(response.status, message);
  }
  return response.json();
}
export async function download(path: string, filename: string) {
  const response = await serverFetch(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(response.status, error.detail);
  }
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
