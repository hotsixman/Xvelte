import { defineConfig, Plugin } from "vite";
import xveltePlugin from "../library/vite"

export default defineConfig({
    plugins: [xveltePlugin() as Plugin]
})