export async function goto(to, option) {
    const fragManager = window.__xvelte__.fragManager;
    await fragManager.fragReady;
    if (typeof (to) === "string") {
        to = new URL(to, location.href);
    }
    const renderingDataRequestUrl = new URL('/__xvelte__/navigation', location.href);
    renderingDataRequestUrl.searchParams.set('to', to.pathname);
    const renderingData = await fetch(renderingDataRequestUrl).then((res) => res.json());
    const d = [...renderingData.layouts, renderingData.page];
    let diffrentFrom = 0;
    for (let i = 0; i < Math.max(d.length, fragManager.fragIds.length); i++) {
        if (d[i]?.id === fragManager.fragIds?.[i]) {
            diffrentFrom = i + 1;
        }
        else {
            break;
        }
    }
    let replacedFrag = fragManager.fragsDataMap.get(fragManager.fragIds[diffrentFrom])?.body ?? null;
    if (replacedFrag) {
        let marker = document.createElement('template');
        replacedFrag.replaceWith(marker);
        replacedFrag = marker;
    }
    switch (option?.type) {
        case 'replace': {
            history.replaceState({}, "", to);
            break;
        }
        case undefined:
        case 'push': {
            history.pushState({}, "", to);
            break;
        }
    }
    for (let i = fragManager.fragIds.length - 1; i >= diffrentFrom; i--) {
        await fragManager.destroyFrag(fragManager.fragIds[i]);
        fragManager.fragIds.pop();
    }
    const { headFrags, bodyFrag, fragDatas } = fragManager.createFrag(d.slice(diffrentFrom));
    headFrags.forEach((hf) => {
        document.head.insertBefore(hf, fragManager.head?.end ?? null);
    });
    if (bodyFrag) {
        if (replacedFrag) {
            replacedFrag.replaceWith(bodyFrag);
            replacedFrag.remove();
        }
        else {
            document.querySelector('xvelte-body')?.appendChild(bodyFrag);
        }
    }
    ;
    fragDatas.forEach((d) => {
        d.scripts.forEach((script) => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            if (script.src) {
                newScript.src = script.src;
            }
            script.replaceWith(newScript);
            script.remove();
        });
        fragManager.fragIds.push(d.id);
        fragManager.fragsDataMap.set(d.id, d);
    });
}
export function addAnchorClickHandler() {
    document.addEventListener('click', (event) => {
        if (event.target && event.target instanceof HTMLAnchorElement && event.target.origin === location.origin && (!event.target.target || event.target.target === "_self")) {
            event.preventDefault();
            goto(event.target.href);
        }
    });
}
export function addPopstateHandler() {
    window.addEventListener('popstate', (event) => {
        event.preventDefault();
        goto(location.href, { type: 'none' });
    });
}
//# sourceMappingURL=navigation.js.map