import XvelteApp from "../../library/index"
import template from './app.html?raw';
import Layout from "./page/layout.svelte";
import IndexPage from "./page/index/page.svelte";
import AboutPage from "./page/about/page.svelte";
import fs from 'node:fs';

const app = new XvelteApp(template);

app.page('/', () => {
    return {
        layouts: [{
            component: Layout
        }],
        component: IndexPage
    }
});
app.page('/about', () => ({
    layouts: [
        {
            component: Layout
        }
    ],
    component: AboutPage
}))

app.post('/test', async (event) => {
    const formData = await event.form();
    console.log(formData);
    return null;
})

export default app;

if (!process.env.isDev) {
    app.listen(3000, () => console.log('listening on 3000'));
}