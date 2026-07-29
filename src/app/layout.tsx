import type { ReactNode } from "react";

export const metadata = {
  title: "awo dashboard",
  description: "Progress across awo workspaces",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#fbfbfa",
          color: "#1a1a18",
          font: "14px/1.5 ui-sans-serif, -apple-system, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
