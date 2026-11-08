export function cookieMiddleware(req, res, next) {
  const header = req.headers.cookie;
  req.cookies = {};

  if (header) {
    const pairs = header.split(";");
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx !== -1) {
        const key = pair.slice(0, idx).trim();
        const rawVal = pair.slice(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(rawVal);
        } catch {
          req.cookies[key] = rawVal;
        }
      }
    }
  }

  res.setAuthCookies = (accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === "production";
    const accessCookie = [
      `access_token=${encodeURIComponent(accessToken)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=1800" // 30 minutes
    ];
    if (isProd) accessCookie.push("Secure");

    const cookies = [accessCookie.join("; ")];

    if (refreshToken) {
      const refreshCookie = [
        `refresh_token=${encodeURIComponent(refreshToken)}`,
        "Path=/api/auth",
        "HttpOnly",
        "SameSite=Strict",
        "Max-Age=2592000" // 30 days
      ];
      if (isProd) refreshCookie.push("Secure");
      cookies.push(refreshCookie.join("; "));
    }

    res.setHeader("Set-Cookie", cookies);
  };

  res.clearAuthCookies = () => {
    res.setHeader("Set-Cookie", [
      "access_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      "refresh_token=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0"
    ]);
  };

  next();
}
