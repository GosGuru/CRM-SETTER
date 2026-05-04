export function shouldValidateExtensionToken(request: Request) {
  const hostname = new URL(request.url).hostname;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  return process.env.NODE_ENV !== "development" && !isLocalHost;
}

export function hasValidExtensionToken(request: Request, token?: string) {
  if (!token || !shouldValidateExtensionToken(request)) return true;
  return request.headers.get("x-extension-token") === token;
}
