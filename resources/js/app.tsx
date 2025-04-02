import "../css/app.css";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { initializeTheme } from "./hooks/use-appearance";
import { Toaster } from "sonner";
import axios from "axios";

// Type declarations for environment variables
declare global {
  interface ImportMeta {
    env: {
      VITE_APP_NAME?: string;
      VITE_APP_URL?: string;
      PROD?: boolean;
    };
  }
}

const appName = import.meta.env.VITE_APP_NAME || "AICOM Marketing Services";

// Safe URL configuration with type checking
const baseURL = (() => {
  const url = import.meta.env.VITE_APP_URL || window.location.origin;
  return import.meta.env.PROD ? url.toString().replace('http://', 'https://') : url;
})();

// Configure axios with proper types
axios.defaults.baseURL = baseURL;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob("./pages/**/*.tsx")),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <>
        <App {...props} />
        <Toaster />
      </>,
    );
  },
  progress: {
    color: "#4B5563",
  },
});

// Initialize theme
initializeTheme();