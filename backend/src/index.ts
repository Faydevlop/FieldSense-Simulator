import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import { config } from "./config/v1/config";
import v1Routes from "./routes/v1";
import { generateSwaggerBundle } from "./swagger";

const app = express();
const port = config.PORT;

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(hpp());

const allowedOrigins = config.CORS_URLS.split(",").map(origin => origin.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: 200,
    message: "success",
    data: {
      service: "FieldSense backend is running",
      environment: config.ENVIRONMENT,
    },
    toastMessage: "successfully fetched details",
  });
});

generateSwaggerBundle();

app.use("/v1", v1Routes);

if (config.ENVIRONMENT === "PROD") {
  app.use("/swagger", (_req: Request, res: Response) => {
    res.status(404).send("Swagger is disabled in production environment.");
  });
}

app.use(express.static(path.join(process.cwd(), "public")));

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    message: "Route not found",
    data: {},
    toastMessage: "Requested route does not exist",
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] unhandled error", err);
  res.status(500).json({
    status: 500,
    message: "Internal server error",
    data: {},
    toastMessage: "Something went wrong",
  });
});

async function bootstrap(): Promise<void> {
  app.listen(port, () => {
    console.info(`[server] listening on port ${port} (${config.ENVIRONMENT})`);
  });
}

void bootstrap();

export default app;
