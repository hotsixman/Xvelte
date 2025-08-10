import { XvelteApp } from "./framework/XvelteApp.js";
import template from './app.html?raw';
import Page from "./page/page.svelte";

const app = new XvelteApp(template);

app.page('/', () => ({component: Page}));

export default app;

if(!process.env.isDev){
    app.listen();
}