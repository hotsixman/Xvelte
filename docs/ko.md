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

Xvelte는 Svelte를 기반으로 하는 최신 웹 프레임워크로, 서버 사이드 렌더링(SSR)과 함께 선택적인 클라이언트 사이드 하이드레이션을 제공합니다. '아일랜드' 또는 부분 하이드레이션이라고 불리는 개념을 통해 페이지의 상호작용이 필요한 부분만 하이드레이션하여 기본적으로 빠른 경험을 제공하는 것을 목표로 합니다. Vite를 사용하여 빠르고 현대적인 개발 환경을 제공하며, 클라이언트 측 네비게이션을 통해 단일 페이지 애플리케이션과 같은 부드러운 사용자 경험을 제공합니다. Node.js http, Express 등과 쉽게 통합할 수 있습니다.

# 프로젝트 설정
`npx @hotsixman/xvelte {project path}`

메인 파일은 `src/app.ts`입니다.

# 문서
[여기](./ko/10.%20소개.md)를 참고해주세요.