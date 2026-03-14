declare global {
  function acquireVsCodeApi(): {
    postMessage: (msg: unknown) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
  };

  interface Window {
    hljs?: {
      getLanguage: (lang: string) => unknown;
      highlight: (code: string, opts: { language: string }) => { value: string };
      highlightAuto: (code: string) => { value: string };
    };
    onAgentChange: () => void;
    attachFile: () => void;
    handleAction: () => void;
    openInEditor: (btn: HTMLElement) => void;
    removeImage: (el: HTMLElement) => void;
    removeEl: (el: HTMLElement) => void;
    clearChat: () => void;
  }
}

export {};
