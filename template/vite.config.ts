import { defineConfig, Plugin } from "vite";
import xveltePlugin from "@hotsixman/xvelte/vite"

export default defineConfig({
    plugins: [xveltePlugin() as Plugin]
})