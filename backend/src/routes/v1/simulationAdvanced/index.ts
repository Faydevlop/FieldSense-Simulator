import { Router } from "express";
import {
  compareAdvancedSimulations,
  exportAdvancedSimulation,
  getAdvancedSimulation,
  listAdvancedSimulations,
  resetAdvancedSimulation,
  runAdvancedSimulation,
  startAdvancedSimulation,
} from "../../../controller/simulationAdvanced";

const router = Router();

router.get("/", listAdvancedSimulations);
router.get("/compare", compareAdvancedSimulations);
router.post("/start", startAdvancedSimulation);
router.post("/run", runAdvancedSimulation);
router.post("/reset", resetAdvancedSimulation);
router.get("/:id/export", exportAdvancedSimulation);
router.get("/:id", getAdvancedSimulation);

export default router;
