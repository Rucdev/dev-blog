import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "rucdev-blog",
    compatibilityDate: "2026-10-17",
    observability: {
      enabled: true,
    },
    domains: ["blog.rucdev.com"],
  },
});
