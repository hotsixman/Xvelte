import { build } from "vite";
import { compile } from "svelte/compiler";
import { createHash } from 'node:crypto';
import xvelte from "../src/framework/vite/plugin/xvelte.js";

try {
    await build({
        plugins: [xvelte()],
        configFile: false
    })
}
catch (err) {
    console.error(err);
    console.log('Build failed.');
}

export { };

function generateHash(text: string) {
    return createHash('sha-256').update(text).digest('hex');
}