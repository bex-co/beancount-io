import { redirect } from "@tanstack/react-router";
import type { RouteLoader } from "@/common/types/route-loader";

export const loginLoader: RouteLoader<"/auth/login"> = async ({ context }) => {
  if (context.userProfile) {
    throw redirect({
      to: "/auth/welcome",
    });
  }
};
