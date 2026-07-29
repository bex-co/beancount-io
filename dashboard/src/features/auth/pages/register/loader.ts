import { redirect } from "@tanstack/react-router";
import type { RouteLoader } from "@/common/types/route-loader";

export const registerLoader: RouteLoader<"/auth/sign-up"> = async ({
  context,
}) => {
  if (context.userProfile) {
    throw redirect({
      to: "/auth/welcome",
    });
  }
};
