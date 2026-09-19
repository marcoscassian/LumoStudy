function isPrivateNetworkHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Desenvolvimento local/LAN: o backend FastAPI roda na porta 8000.
    if (isPrivateNetworkHost(hostname)) {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      return `${protocol}//${hostname}:8000`;
    }

    // Em produção, NEXT_PUBLIC_API_URL deve ser configurada quando o backend
    // estiver em outro domínio. O mesmo origin é um fallback seguro para quem
    // publicar frontend e API atrás do mesmo proxy.
    return window.location.origin;
  }

  return "http://localhost:8000";
}

export const API_BASE = resolveApiBase();

export function formatApiError(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => formatApiError(item, ""))
      .filter((message) => Boolean(message));

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  if (detail && typeof detail === "object") {
    const item = detail as { msg?: unknown; detail?: unknown; message?: unknown };

    if (typeof item.msg === "string" && item.msg.trim()) {
      return item.msg;
    }

    if (typeof item.message === "string" && item.message.trim()) {
      return item.message;
    }

    if (item.detail !== undefined) {
      return formatApiError(item.detail, fallback);
    }
  }

  return fallback;
}
