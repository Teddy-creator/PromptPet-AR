import "server-only";

export function getExternalOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || requestUrl.protocol.replace(/:$/, "");

  if (!host) {
    return requestUrl.origin;
  }

  return `${protocol}://${host}`;
}
