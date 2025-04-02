import "../css/app.css";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { initializeTheme } from "./hooks/use-appearance";
import { Toaster } from "sonner";
import axios from "axios"; // Import axios directly

const appName = import.meta.env.VITE_APP_NAME || "AICOM Marketing Services";

// Configure axios before creating Inertia app
axios.defaults.baseURL = import.meta.env.VITE_APP_URL || window.location.origin;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Ensure all links use HTTPS
if (import.meta.env.PROD) {
  axios.defaults.baseURL = axios.defaults.baseURL.toString().replace('http://', 'https://');
}

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

// Initialize dark/light mode