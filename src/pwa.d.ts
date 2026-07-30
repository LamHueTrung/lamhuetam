declare module "virtual:pwa-register/react" {
  import type { ReactNode } from "react";

  export function useRegisterSW(): {
    offlineReady: boolean;
    needRefresh: boolean;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

declare const __APP_VERSION__: string;
