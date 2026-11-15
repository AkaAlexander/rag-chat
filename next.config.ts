import type { NextConfig } from "next";
import { readConfig } from "./src/lib/config";

readConfig();

const config: NextConfig = {};
export default config;
