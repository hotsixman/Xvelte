import { XvelteApp } from "./src/framework/XvelteApp.js";
import template from './app.html?raw';
import Page from "./src/app/page/page.svelte";

console.log(template)

const app = new XvelteApp(template, Page);
export default app;

app.listen();