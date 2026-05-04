import { Router } from "express";
import baseRoutes from "./base";
import genericRoutes from "./generic";

const router = Router();

router.use("/", baseRoutes);
router.use("/generic", genericRoutes);

export default router;
