import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sage: {
          50: "#f5f7f5",
          100: "#e6ede7",
          200: "#cee0cf",
          300: "#abc7ad",
          400: "#81a785",
          500: "#5e8a64",
          600: "#496f4f",
          700: "#3b5840",
          800: "#314634",
          900: "#28392b",
        },
        lavender: {
          50: "#f8f7fc",
          100: "#efeaf9",
          200: "#dfd5f3",
          300: "#c4b3ea",
          400: "#a58dde",
          500: "#8668cc",
          600: "#704fb6",
          700: "#5d3f9b",
          800: "#4d3480",
          900: "#3f2a68",
        },
        mint: {
          50: "#f0f9f5",
          100: "#dcf2e6",
          200: "#bce4d0",
          300: "#8eccb0",
          400: "#5ab08c",
          500: "#359670",
          600: "#277859",
          700: "#216048",
          800: "#1d4d3b",
          900: "#194032",
        },
      },
      boxShadow: {
        "soft-xs": "0 1px 3px 0 rgba(28, 41, 33, 0.03)",
        soft: "0 2px 14px -2px rgba(28, 41, 33, 0.04), 0 1px 4px 0 rgba(28, 41, 33, 0.02)",
        "soft-md": "0 6px 22px -3px rgba(28, 41, 33, 0.06), 0 2px 8px -2px rgba(28, 41, 33, 0.03)",
        "soft-lg": "0 14px 36px -4px rgba(28, 41, 33, 0.08), 0 4px 14px -2px rgba(28, 41, 33, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
