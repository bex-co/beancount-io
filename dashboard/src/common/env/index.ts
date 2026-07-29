import { getSearchParam } from "@/common/lib/search-params";

export const isSsr = typeof window === "undefined";

export const checkIsProd = (): boolean => {
  return import.meta.env.PROD && getSearchParam("dev") === null;
};
