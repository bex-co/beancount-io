declare global {
  type ApiResponse<T> = {
    data: T;
    success: boolean;
    error?: string;
  };

  interface Window {
    // Note: window.gtag / window.dataLayer typings live with the analytics
    // module at src/common/analytics/gtag.d.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __APOLLO_STATE__?: any; // Apollo Client SSR state for hydration
    __THEME__?: "light" | "dark"; // Theme from SSR for hydration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __ROUTER_STATE__?: any; // TanStack Router dehydrated state for hydration
  }
}

export {};
