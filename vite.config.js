import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/dosirak-delivery/",
  plugins: [react()],
});