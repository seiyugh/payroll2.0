import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add inline script to apply dark mode immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              // Check localStorage first
              let appearance = localStorage.getItem('appearance');
              
              // If not in localStorage, check cookies
              if (!appearance) {
                const cookies = document.cookie.split(';');
                for (const cookie of cookies) {
                  const [name, value] = cookie.trim().split('=');
                  if (name === 'appearance') {
                    appearance = value;
                    break;
                  }
                }
              }
              
              // Apply dark mode if needed
              const isDark = appearance === 'dark' || 
                (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              
              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

