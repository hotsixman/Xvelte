# Xvelte
Xvelte는 [Svelte](https://github.com/sveltejs/svelte)를 사용한 SSR 프레임워크입니다. 부분 클라이언트 렌더링(Island)를 사용할 수 있으며, [Node.js http](https://nodejs.org/api/http.html), [Express](https://expressjs.com) 등과 쉽게 통합할 수 있습니다.

[!Important]
아직 개발중이기 때문에 버그 및 난해한 코드가 있을 수 있습니다.

## 설치
[!NOTE]
`template` 폴더를 참고하십시오.

### 1. 라이브러리 설치
아래 코드를 터미널에 입력하여 라이브러리를 설치합니다.
`npm i @hotsixman/xvelte`

### 2. 프로젝트 설정
1. `src/app.ts` 또는 `src/app.js`를 생성합니다. 이것은 프로젝트의 메인 파일입니다.
2. `vite.config.ts`를 생성하고 다음과 같이 작성합니다.
    ```ts
    import { defineConfig, Plugin } from "vite";
    import xveltePlugin from "@hotsixman/xvelte/vite"

    export default defineConfig({
        plugins: [xveltePlugin() as Plugin]
    })
    ```
3. `src/env.d.ts`를 생성하고 다음과 같이 작성합니다.
    ```ts
    /// <reference types="@hotsixman/xvelte/dts/client.d.ts" />
    /// <reference types="@hotsixman/xvelte/dts/server.d.ts" />
    ```

### 3. `src/app.js`/`src/app.ts` 설정
`src/app.js` 또는 `src/app.ts`(이하 app 파일)에서는 `XvelteApp` 인스턴스를 `default`로 내보내야합니다. 따라서 아래와 같이 작성합니다.
```ts
import XvelteApp from "@hotsixman/xvelte"

const app = new XvelteApp(template);

export default app;
```

이때 `template` 변수는 앱에서 사용할 기본적인 html 템플릿입니다. `import template from './app.html?raw'`와 같이 불러와도 되고, `fs.readFile` 등을 사용하여 불러와도 됩니다.

만약 프로덕션에서 app 파일을 실행하여 서버를 실행할 예정이라면, 다음 코드를 app 파일 아래에 추가하세요.
```ts
if(!process.env.isDev){
    app.listen(3000, () => {console.log(`server is listening on port 3000`)}); // port는 변경할 수 있습니다.
}
```

### 4. 라우팅
XvelteApp은 핸들러 함수를 등록하여 요청을 처리할 수 있습니다.
```ts
...
// 페이지 추가
app.page('/', (event) => {
    // 여기에 서버 로직을 작성합니다.
    console.log("Request received at '/'");

    const currentTimeString = new Date().toLocaleTimeString();

    return {
        layouts: [
            {
                component: Layout // Svelte 컴포넌트
            }
        ],
        component: Page, // Svelte 컴포넌트
        props:{
            currentTimeString
        } // 해당 컴포넌트에 사용할 props
    }
});

// 엔드포인트 추가
// Express와 비슷한 방식으로 동적라우팅을 사용할 수 있습니다.
// get 뿐 아니라 post, put, delete도 사용 가능하며, all을 사용하면 모든 요청 메소드에 핸들러 함수를 사용할 수 있습니다.
app.get('/test/:param', (event) => { 
    console.log(`Request received at '${event.url.pathname}'`);

    const name = event.getCookie('name');
    event.getCookie('age', '20');

    event.setHeader('content-type', 'text/plain; charset=utf-8');

    return `Your name is ${name}`;
})
```

레이아웃을 사용할 경우, 페이지를 이동할 때 공통된 레이아웃은 재생성되지 않고 그대로 사용됩니다.

## 레이아웃
SvelteKit에서는 레이아웃 컴포넌트에 `<slot/>` 또는 `{@render children?.()}`을 사용하여 하위 레이아웃 또는 페이지 컴포넌트가 들어올 자리를 나타내지만, Xvelte에서는 `<Slot/>` 컴포넌트 또는 `<xvelte-slot></xvelte-slot>` 태그를 사용하여 나타냅니다. `Slot` 컴포넌트는 `@hotsixman/xvelte/components/Slot.svelte`에서 import 할 수 있습니다. 

## 부분 클라이언트 렌더링
Xvelte에서는 쉽게 부분 클라이언트 렌더링을 사용할 수 있습니다.
```svelte
<script>
    import Island from '@hotsixman/xvelte/components/Island.svelte';
    // 클라이언트 렌더링을 사용하려면 import 경로 뒤에 `?client`를 붙이면 됩니다.
    import Counter from './Counter.svelte?client';
</script>

<Island component={Counter}/>
<!--또는-->
<xvelte-island component={Counter}></xvelte-island>
```

컴포넌트를 import 할 때 `?client`를 뒤에 붙이면, 컴포넌트가 아닌 클라언트에서 해당 컴포넌트를 불러올 수 있는 경로로 바뀝니다. 즉, 위 코드에서 `Counter`는 문자열입니다. 브라우저에서 이 경로로 요청을 보내면 컴포넌트를 import 할 수 있습니다. 이를 `Island` 컴포넌트 또는 `xvelte-island` 요소에 속성값으로 넣으면, 브라우저에서 해당 컴포넌트를 import 한 뒤 렌더링합니다.