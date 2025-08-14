import XvelteApp from "../../library/index"
import template from './app.html?raw';
import Layout from "./page/layout.svelte";
import IndexPage from "./page/index/page.svelte";
import AboutPage from "./page/about/page.svelte";
import Layout2 from "./page/layout2.svelte";

const app = new XvelteApp(template);

app.page('/', () => ({
    layouts: [{
        component: Layout
    },
    {
        component: Layout2
    }],
    component: IndexPage
}));
app.page('/about', () => ({
    layouts: [
        {
            component: Layout
        }
    ],
    component: AboutPage
}))

export default app;

if (!process.env.isDev) {
    app.listen();
}