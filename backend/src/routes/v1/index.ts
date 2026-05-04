import { Router } from "express";
import baseRoutes from "./base";
import genericRoutes from "./generic";
import simulationRoutes from "./simulation";

const router = Router();

router.use("/", baseRoutes);
router.use("/generic", genericRoutes);
router.use("/simulation", simulationRoutes);

export default router;
