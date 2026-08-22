import { FavaApiClient } from "./fava";

export type FavaApiContext = {
  favaApiClient: FavaApiClient;
  favaUser: { username: string; password: string };
};
