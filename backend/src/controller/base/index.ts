import { Request, Response } from "express";
import { packageJSON } from "../../utils/v1/package";

export function ping(_req: Request, res: Response): void {
  res.status(200).json({
    status: 200,
    message: "success",
    data: { ping: "pong" },
    toastMessage: "successfully fetched details",
  });
}

export function version(_req: Request, res: Response): void {
  res.status(200).json({
    status: 200,
    message: "success",
    data: { version: packageJSON.version },
    toastMessage: "successfully fetched details",
  });
}

export function test(_req: Request, res: Response): void {
  res.status(200).json({
    status: 200,
    message: "success",
    data: {
      message: "All ok",
      version: packageJSON.version,
      service: packageJSON.name,
    },
    toastMessage: "successfully fetched details",
  });
}
