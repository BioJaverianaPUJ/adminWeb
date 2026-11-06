export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  init: RequestInit = {},
  notifySession = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/admin-api${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init.headers },
      signal: init.signal ?? AbortSignal.timeout(60000),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      0,
      "No pudimos conectar. Revisa la conexión e intenta de nuevo.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (
      notifySession &&
      (response.status === 401 ||
        response.headers.get("X-Session-Ended") === "1")
    )
      window.dispatchEvent(new Event("session-ended"));
    throw new ApiError(
      response.status,
      body.message ?? "No fue posible completar la operación.",
    );
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No fue posible completar la operación.";
}
