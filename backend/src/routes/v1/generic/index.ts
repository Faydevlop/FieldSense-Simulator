import { Router } from "express";
import {
  getAllConstants,
  getSimulation,
  resetSimulation,
  runSimulation,
  startSimulation,
} from "../../../controller/generic";

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
router.post("/simulation/start", startSimulation);
router.post("/simulation/run", runSimulation);
router.get("/simulation/:id", getSimulation);
router.post("/simulation/reset", resetSimulation);

export default router;
