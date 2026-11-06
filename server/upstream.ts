export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  USER_DEACTIVATED: "Esta cuenta está suspendida.",
  UNAUTHORIZED: "La sesión terminó. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permiso para realizar esta operación.",
  SPECIES_ALREADY_EXISTS: "Ya existe una especie con ese nombre.",
  USERNAME_ALREADY_EXISTS: "Ese nombre de usuario ya está en uso.",
};
export type Upstream = <T>(
  path: string,
  token?: string,
  method?: string,
  body?: unknown,
) => Promise<T>;
export function createUpstream(base: string): Upstream {
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw Error("BACKEND_URL debe usar HTTPS.");
  return async <T>(
    path: string,
    token?: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(base.replace(/\/$/, "") + path, {
        method,
        redirect: "error",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new HttpError(
        502,
        "No pudimos conectar con BioJaveriana. Intenta de nuevo.",
      );
    }
    const data = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!response.ok)
      throw new HttpError(
        response.status,
        messages[String(data?.code)] ??
          {
            401: "La sesión terminó.",
            403: "No tienes permiso.",
            404: "No se encontró el registro.",
            409: "El cambio entra en conflicto con otro registro.",
            400: "El servidor rechazó los datos. Revisa los campos.",
          }[response.status] ??
          "No fue posible completar la operación.",
      );
    return data as T;
  };
}
