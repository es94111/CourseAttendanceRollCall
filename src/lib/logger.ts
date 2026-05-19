import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "90d",
      maxSize: "100m"
    })
  ]
})

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }))
}
