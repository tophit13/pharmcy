interface Window {
  electronAPI?: {
    toggleAutoStart: (enable: boolean) => Promise<boolean>;
    getAutoStartStatus: () => Promise<boolean>;
  };
}
