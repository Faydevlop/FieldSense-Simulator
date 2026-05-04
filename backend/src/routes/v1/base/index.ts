import { Router } from "express";
import { ping, test, version } from "../../../controller/base";

const router = Router();

/**
 * @swagger
 * /v1/ping:
 *   get:
 *     tags:
 *       - Base
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: Server reachable
 */
router.get("/ping", ping);

/**
 * @swagger
 * /v1/version:
 *   get:
 *     tags:
 *       - Base
 *     summary: API version endpoint
 *     responses:
 *       200:
 *         description: Current API version
 */
router.get("/version", version);

/**
 * @swagger
 * /v1/test:
 *   get:
 *     tags:
 *       - Base
 *     summary: Service test endpoint
 *     responses:
 *       200:
 *         description: Service metadata
 */
router.get("/test", test);

export default router;
