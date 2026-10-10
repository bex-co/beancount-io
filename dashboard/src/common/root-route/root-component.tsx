import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootProvider } from "@/common/providers/root-provider";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  isLocallyHandledChunkError,
  reloadOnceForStaleChunk,
} from "@/common/lib/errors/chunk-load-error";

export const RootComponent = () => {
  // Leave Vite's rejection intact so optional imports can claim their own
  // errors. Check after promise reactions settle; unclaimed chunks still
  // reload once to adopt the current build, even if the error unmounts root.
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      const error = (event as Event & { payload?: unknown }).payload;
      window.setTimeout(() => {
        if (!isLocallyHandledChunkError(error)) reloadOnceForStaleChunk();
      }, 0);
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
