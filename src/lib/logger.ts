import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

const transport = isProd
  ? undefined
  : pino.transport({
      target: "pino-pretty",
      options: { colorize: true },
    });

const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "token", "secret"],
    remove: true,
  },
}, transport);

export default logger;
