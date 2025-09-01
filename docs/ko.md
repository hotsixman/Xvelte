# Xvelte
<div style="text-align:center;"><img src="./img/logo.svg"></div>

```ts
import XvelteApp from '@hotsixman/xvelte';
import template from './app.html?raw';
import MainLayout from './layout/MainLayout.svelte';
import Index from './page/Index.svelte';
import About from './page/About.svelte';

const app = new XvelteApp(template);

app.page('/', () => {
    return {
        layouts: [{
            component: MainLayout
        }],
        component: Index
    }
});
app.page('/about', () => {
    return {
        layouts: [{
            component: MainLayout
        }],
        component: About
    }
});

export default app.handler;

if(import.meta.env.PROD){
    app.listen(3000, () => console.log('listening on 3000'));
}
```

Xvelte는 [Svelte](https://github.com/sveltejs/svelte)를 사용한 SSR 프레임워크입니다. 부분 클라이언트 렌더링(Island)를 사용할 수 있으며, [Node.js http](https://nodejs.org/api/http.html), [Express](https://expressjs.com) 등과 쉽게 통합할 수 있습니다.

# 프로젝트 설정
`npx @hotsixman/xvelte {project path}`

메인 파일은 `src/app.ts`입니다.