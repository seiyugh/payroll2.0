// resources/js/lib/utils.ts

export function route(name: string, params: object = {}) {
    const url = new URL(window.location.href);
    // Example of building a route URL, adjust to your needs
    url.pathname = `/${name}`;
    
    // You can append parameters to the URL here
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key].toString());
    });
  
    return url.toString();
  }
  
  // Existing cn function
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";
  
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  