import type { NextConfig } from "next";
import { readConfig } from "./src/lib/config";

readConfig();

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@huggingface/transformers"],
};
export default config;
