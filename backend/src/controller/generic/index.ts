import { Request, Response } from "express";
import { ENVIRONMENT } from "../../utils/v1/constants";

export function getAllConstants(_req: Request, res: Response): void {
  res.status(200).json({
    status: 200,
    message: "success",
    data: {
      ENVIRONMENT,
    },
    toastMessage: "successfully fetched details",
  });
}
