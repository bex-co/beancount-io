import { startServer } from "@/server/start-server";

startServer().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal: failed to start beancount-ledger-v2", err);
  process.exit(1);
});
