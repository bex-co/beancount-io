import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootProvider } from "@/common/providers/root-provider";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { reloadOnceForStaleChunk } from "@/common/lib/errors/chunk-load-error";

export const RootComponent = () => {
  // Vite raises this when a lazy chunk or its stylesheet is gone, which after
  // a deploy means this page belongs to the previous build. Reload once to
  // adopt the current one; if the guard declines, the error is left to reach
  // the nearest error boundary.
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      if (reloadOnceForStaleChunk()) event.preventDefault();
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () =>
      window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  return (
    <RootProvider>
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </RootProvider>
  );
};

export default RootComponent;
