import * as Sentry from "@sentry/react-native";
import { config } from "@/config";

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    debug: __DEV__,
  });
}
