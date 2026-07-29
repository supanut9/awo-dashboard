import path from "node:path";

/** @type {import('next').NextConfig} */
export default {
  // TypeScript 7 is the native rewrite and no longer exposes the compiler API that
  // Next's build worker used, so Next must shell out to `tsc` instead. Without this
  // the production build fails with "TypeScript 7.0.2 does not provide the compiler
  // API required by Next.js" — the alternative was pinning back to TS 6.
  experimental: { useTypeScriptCli: true },
  // This app is its own root; without saying so, turbopack infers a parent
  // directory when other lockfiles exist nearby and warns on every build.
  turbopack: { root: path.dirname(new URL(import.meta.url).pathname) },
};
