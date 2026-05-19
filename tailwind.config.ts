import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        paper: "#F7F7F2",
        accent: "#2F6F73",
        warn: "#B95F24"
      }
    }
  },
  plugins: []
}

export default config
