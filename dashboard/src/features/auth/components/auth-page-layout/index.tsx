import type { ReactNode } from "react";
import { AuthFeaturePanel } from "@/features/auth/components/auth-feature-panel";

type AuthPageLayoutProps = {
  children: ReactNode;
};

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <main className="flex-1 flex items-center justify-center py-12 px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <AuthFeaturePanel />
    </div>
  );
}
