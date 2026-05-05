import { Router } from "express";
import baseRoutes from "./base";
import genericRoutes from "./generic";
import simulationRoutes from "./simulation";
import simulationAdvancedRoutes from "./simulationAdvanced";

const router = Router();

router.use("/", baseRoutes);
router.use("/generic", genericRoutes);
router.use("/simulation/advanced", simulationAdvancedRoutes);
router.use("/simulation", simulationRoutes);

export default router;
