import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        linkedin: "#0a66c2",
        "linkedin-dark": "#004182",
      },
    },
  },
  plugins: [],
};

export default config;
