import adapter from "@sveltejs/adapter-cloudflare";
import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
    }),
  ],
  test: {
    globals: true,
    passWithNoTests: true,
  },
});
