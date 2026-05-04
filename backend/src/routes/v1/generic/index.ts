import { Router } from "express";
import { getAllConstants } from "../../../controller/generic";

const router = Router();

/**
 * @swagger
 * /v1/generic/constants:
 *   get:
 *     tags:
 *       - Generic
 *     summary: Get all common constants
 *     description: Returns constant maps used across backend and frontend applications.
 *     responses:
 *       200:
 *         description: Constants fetched successfully
 */
router.get("/constants", getAllConstants);

export default router;
