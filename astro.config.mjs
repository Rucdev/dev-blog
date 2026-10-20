// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://blog.rucdev.com",
  integrations: [mdx(), sitemap(), svelte()],
  markdown: {
    shikiConfig: { theme: "github-dark-dimmed" },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["ui-monospace", "monospace"],
      weights: [400, 500, 700],
    },
    {
      provider: fontProviders.google(),
      name: "Noto Sans JP",
      cssVariable: "--font-noto-sans-jp",
      fallbacks: ["system-ui", "sans-serif"],
      weights: [400, 500, 700],
    },
  ],
});
