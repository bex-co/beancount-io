import { Navigate } from "@tanstack/react-router";
import { useRootContext } from "@/common/hooks/use-root-context";

export default function HomePage() {
  const { userProfile } = useRootContext();
  if (userProfile) {
    return <Navigate to="/auth/welcome" />;
  }
  return <Navigate to="/auth/login" />;
}
