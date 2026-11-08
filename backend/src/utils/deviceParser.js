/**
 * Device, System, OS, and Browser Detection Engine
 * Parses raw User-Agent strings and client headers into human-readable forensics.
 */

export function parseClientSystem(userAgent = "") {
  if (!userAgent || typeof userAgent !== "string") {
    return {
      systemSummary: "Unknown System",
      os: "Unknown OS",
      browser: "Unknown Browser",
      deviceType: "Desktop",
      isMobile: false
    };
  }

  const ua = userAgent.trim();
  const lower = ua.toLowerCase();

  // 1. Detect Bots, Tools & API Clients
  if (/postman/i.test(lower)) {
    return {
      systemSummary: "Postman API Client",
      os: "API Client",
      browser: "Postman",
      deviceType: "Bot / API",
      isMobile: false
    };
  }
  if (/curl|wget|python|axios|undici|node-fetch|insomnia/i.test(lower)) {
    return {
      systemSummary: "HTTP / CLI Client",
      os: "CLI Engine",
      browser: "HTTP Script",
      deviceType: "Bot / API",
      isMobile: false
    };
  }

  // 2. Detect Operating System
  let os = "Unknown OS";
  let deviceType = "Desktop";
  let deviceBrand = "";

  if (/windows nt 10\.0/i.test(lower)) {
    os = "Windows 10 / 11";
  } else if (/windows nt 6\.3/i.test(lower)) {
    os = "Windows 8.1";
  } else if (/windows nt 6\.2/i.test(lower)) {
    os = "Windows 8";
  } else if (/windows nt 6\.1/i.test(lower)) {
    os = "Windows 7";
  } else if (/windows/i.test(lower)) {
    os = "Windows PC";
  } else if (/iphone/i.test(lower)) {
    const match = ua.match(/iPhone OS ([0-9_]+)/i);
    const ver = match ? match[1].replace(/_/g, ".") : "";
    os = ver ? `iOS ${ver}` : "iOS";
    deviceType = "Mobile";
    deviceBrand = "Apple iPhone";
  } else if (/ipad/i.test(lower)) {
    const match = ua.match(/CPU OS ([0-9_]+)/i);
    const ver = match ? match[1].replace(/_/g, ".") : "";
    os = ver ? `iPadOS ${ver}` : "iPadOS";
    deviceType = "Tablet";
    deviceBrand = "Apple iPad";
  } else if (/macintosh|mac os x/i.test(lower)) {
    const match = ua.match(/Mac OS X ([0-9_]+)/i);
    const ver = match ? match[1].replace(/_/g, ".") : "";
    os = ver ? `macOS ${ver}` : "macOS";
    deviceType = "Desktop";
    deviceBrand = "Mac Desktop";
  } else if (/android/i.test(lower)) {
    const match = ua.match(/Android ([0-9.]+)/i);
    const ver = match ? `Android ${match[1]}` : "Android";
    os = ver;
    deviceType = /tablet/i.test(lower) ? "Tablet" : "Mobile";

    // Attempt to extract Android model
    const modelMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
    if (modelMatch && modelMatch[1]) {
      deviceBrand = modelMatch[1].trim();
    } else {
      deviceBrand = "Android Device";
    }
  } else if (/ubuntu/i.test(lower)) {
    os = "Ubuntu Linux";
    deviceType = "Desktop";
  } else if (/cros/i.test(lower)) {
    os = "ChromeOS";
    deviceType = "Desktop";
  } else if (/linux/i.test(lower)) {
    os = "Linux";
    deviceType = "Desktop";
  }

  // 3. Detect Browser
  let browser = "Web Browser";

  if (/edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/edg\/([0-9]+)/i);
    browser = `Microsoft Edge ${match ? match[1] : ""}`.trim();
  } else if (/opr\/([0-9.]+)|opera/i.test(ua)) {
    const match = ua.match(/opr\/([0-9]+)/i);
    browser = `Opera ${match ? match[1] : ""}`.trim();
  } else if (/samsungbrowser\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/samsungbrowser\/([0-9]+)/i);
    browser = `Samsung Internet ${match ? match[1] : ""}`.trim();
  } else if (/chrome\/([0-9.]+)/i.test(ua) && !/edg/i.test(ua)) {
    const match = ua.match(/chrome\/([0-9]+)/i);
    browser = `Google Chrome ${match ? match[1] : ""}`.trim();
  } else if (/firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/firefox\/([0-9]+)/i);
    browser = `Mozilla Firefox ${match ? match[1] : ""}`.trim();
  } else if (/version\/([0-9.]+).*safari/i.test(ua)) {
    const match = ua.match(/version\/([0-9]+)/i);
    browser = `Apple Safari ${match ? match[1] : ""}`.trim();
  } else if (/safari/i.test(ua)) {
    browser = "Apple Safari";
  }

  // 4. Build System Summary
  let systemSummary = "";
  if (deviceBrand) {
    systemSummary = `${deviceBrand} • ${browser}`;
  } else if (os.startsWith("Windows")) {
    systemSummary = `Windows PC • ${browser}`;
  } else if (os.startsWith("macOS")) {
    systemSummary = `Mac Desktop • ${browser}`;
  } else if (os.startsWith("Linux") || os.startsWith("Ubuntu")) {
    systemSummary = `Linux PC • ${browser}`;
  } else {
    systemSummary = `${os} • ${browser}`;
  }

  return {
    systemSummary,
    os,
    browser,
    deviceType,
    isMobile: deviceType === "Mobile" || deviceType === "Tablet"
  };
}
