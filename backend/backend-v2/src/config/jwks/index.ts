import type { Environment } from "@/config/config";
import devJwks from "./dev.json";
import prodJwks from "./prod.json";

export function getJwks(env: Environment): { keys: object[] } {
  return env === "production" ? prodJwks : devJwks;
}
