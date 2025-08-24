import XvelteApp from "@hotsixman/xvelte"
import template from './app.html?raw';
import Page from './page/index/page.svelte'

const app = new XvelteApp(template);

app.page('/', () => {
    return {
        component: Page,
        props: {
            currentTimeStamp: new Date().toLocaleTimeString()
        }
    }
})

export default app;

if (!process.env.isDev) {
    app.listen(3000, () => console.log('listening on 3000'));
}