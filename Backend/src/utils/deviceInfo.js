import {UAParser} from "ua-parser-js";

export const getDeviceInfo = (req, platform) => {
  const parser = new UAParser(req.headers["user-agent"]);
  const ua = parser.getResult();

  return {
    name:
      platform === "mobile"
        ? ua.device.model || "Android Device"
        : `${ua.browser.name || "Browser"} ${ua.browser.version || ""}`,
    os: `${ua.os.name || "Unknown"} ${ua.os.version || ""}`,
    userAgent: req.headers["user-agent"],
    ipAddress:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress,
  };
};
