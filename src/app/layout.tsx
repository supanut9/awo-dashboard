import type { ReactNode } from "react";
import "./globals.css";
import packageJson from "../../package.json";

export const metadata = {
  title: "awo dashboard",
  description: "Progress across awo workspaces",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <footer className="px-4 pb-5 text-center font-mono text-[10px] text-slate-500">
          awo dashboard v{packageJson.version}
        </footer>
      </body>
    </html>
  );
}
