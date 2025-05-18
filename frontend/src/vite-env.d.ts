/// <reference types="vite/client" />

interface Window {
  RUNTIME_CONFIG?: {
    API_URL: string;
    VERSION: string;
    [key: string]: any;
  };
}
