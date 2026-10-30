// The Content Security Policy tells the browser which sources the page may
// load code, styles and images from. If an attacker ever got text such as a
// <script> tag into a report's notes, the browser would still refuse to run it.
// 'unsafe-inline' for styles is needed because Tailwind's CDN build and Leaflet
// both set styles at runtime; scripts stay locked down.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://unpkg.com https://tile.openstreetmap.org",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

function securityHeaders(request, response, next) {
  response.set({
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  });
  next();
}

module.exports = { securityHeaders };
