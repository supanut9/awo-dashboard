/** @type {import('next').NextConfig} */
export default {
  // The dashboard is read-only over data someone else published; nothing here
  // should be statically cached, or a project page shows stale state.
  experimental: {},
};
