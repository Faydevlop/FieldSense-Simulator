import { Router } from "express";
import { getSimulation, resetSimulation, runSimulation, startSimulation } from "../../../controller/simulation";

const router = Router();

router.post("/start", startSimulation);
router.post("/run", runSimulation);
router.get("/:id", getSimulation);
router.post("/reset", resetSimulation);

export default router;
