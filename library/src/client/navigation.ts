import type { RenderingData } from "../types";

export async function goto(to: string | URL) {
    const fragManager = window.__xvelte__.fragManager;
    await fragManager.fragReady;
    if (typeof (to) === "string") {
        to = new URL(to, location.href);
    }

    const renderingDataRequestUrl = new URL('/__xvelte__/navigation', location.href);
    renderingDataRequestUrl.searchParams.set('to', to.pathname);
    const renderingData: RenderingData = await fetch(renderingDataRequestUrl).then((res) => res.json());

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

    history.pushState({}, "", to);

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
        else{
            document.querySelector('xvelte-body')?.appendChild(bodyFrag);
        }
    };

    fragDatas.forEach((d) => {
        d.scripts.forEach((script) => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            if(script.src){
                newScript.src = script.src;
            }
            script.replaceWith(newScript);
            script.remove();
        })
        fragManager.fragIds.push(d.id);
        fragManager.fragsDataMap.set(d.id, d);
    });
}