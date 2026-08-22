#!/usr/bin/env node
// IMPORTANT: Import zod-openapi-setup first to extend Zod before any schema files are loaded
import "@/shared/zod-openapi-setup";
import { startServer } from "@/server/start-server";

startServer();
