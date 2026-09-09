import { Slot } from "expo-router";
import { Providers } from "@/common/providers/providers";
import { AppLinkHandler } from "@/common/app-links/app-link-handler";

export default function RootLayout() {
  return (
    <Providers>
      <AppLinkHandler />
      <Slot />
    </Providers>
  );
}
