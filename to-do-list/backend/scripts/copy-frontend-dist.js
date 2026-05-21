import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, "../../frontend/dist");
const targetDir = path.resolve(__dirname, "../dist/client");

if (!fs.existsSync(sourceDir)) {
  console.warn(
    `[copy-frontend-dist] Skipping copy because build output was not found at ${sourceDir}`,
  );
  process.exit(0);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(
  `[copy-frontend-dist] Copied frontend build from ${sourceDir} to ${targetDir}`,
);
