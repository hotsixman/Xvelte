import { defineConfig } from "vite";
import xvelte from "./src/framework/vite/plugin/xvelte.js";

export default defineConfig({
    plugins: [xvelte()]
})