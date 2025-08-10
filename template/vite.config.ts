import { defineConfig, Plugin } from "vite";
import {xveltePlugin} from '../library/index'

export default defineConfig({
    plugins: [xveltePlugin() as Plugin]
})