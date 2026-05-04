import { readFileSync } from "fs";
import path from "path";

const packagePath = path.join(process.cwd(), "package.json");
const packageFile = readFileSync(packagePath, "utf8");

export const packageJSON = JSON.parse(packageFile) as {
  name: string;
  version: string;
  description?: string;
};
