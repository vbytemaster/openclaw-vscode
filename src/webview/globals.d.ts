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
  }
}

export {};
