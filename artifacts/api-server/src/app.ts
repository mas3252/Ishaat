import express, { type Express } from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, serve the compiled React app from the same Express server.
// This lets Render/Railway/Fly/etc. run one web service instead of separate
// frontend and backend services.
const staticDir = process.env.STATIC_DIR ?? path.resolve(process.cwd(), "artifacts/book-inventory/dist/public");
if (process.env.NODE_ENV === "production" && existsSync(staticDir)) {
  app.use(express.static(staticDir));

  // React client-side routes such as /books/1 should still load index.html.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
