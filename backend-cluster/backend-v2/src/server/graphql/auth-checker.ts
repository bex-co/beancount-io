import { AuthChecker } from "type-graphql";
import { IContext } from "./context";
import { UnauthenticatedError } from "@/shared/errors";

export const customAuthChecker: AuthChecker<IContext> = ({
  context,
}: {
  context: IContext;
}) => {
  const { userId } = context;
  if (!userId) {
    throw new UnauthenticatedError("Access denied! Please login to continue!");
  }
  return true; // or false if access is denied
};
