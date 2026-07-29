import { useRootContext } from "@/common/hooks/use-root-context";

export function useIsAuthenticated(): boolean {
  const { userProfile } = useRootContext();
  return userProfile != null;
}
