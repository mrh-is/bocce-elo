import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  PUBLIC_GOOGLE_API_KEY: {
    public: true,
    static: true,
  },
  PUBLIC_SHEET_ID: {
    public: true,
    static: true,
  },
});
