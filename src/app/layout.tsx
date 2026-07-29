import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "awo dashboard",
  description: "Progress across awo workspaces",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
