import { config } from "@/config";
import Constants from "expo-constants";
import { endpointFor } from "@/common/server-url";
import { getServerUrl } from "@/common/vars/server-url";

export const headers: { [key: string]: string } = {
  "x-app-id": config.project,
  "x-app-version": Constants.nativeAppVersion,
};

export const getEndpoint = (path: string) => {
  return endpointFor(getServerUrl(), path);
};
