import type { FragData, RenderingData, RenderingDataElement } from "../types.js";
import type { FragManager } from "./fragManager.js";

export async function goto(to: string | URL, option?: { type?: 'push' | 'replace', state?: Record<string, any> }) {
    const fragManager = window.__xvelte__.fragManager;
    await fragManager.fragReady;

    const renderingDataRequestUrl = getRenderingDataRequestUrl(to);
    const renderingData: RenderingData = await fetch(renderingDataRequestUrl).then((res) => res.json());

    const renderingDataElements = [...renderingData.layouts, renderingData.page];
    const diffrentFrom = findDifferentIndex(renderingDataElements, fragManager);
    const replacedFrag = getReplacedFragment(fragManager, diffrentFrom);

    switch (option?.type) {
        case 'replace': {
            history.replaceState({
                renderingData,
                pageState: option?.state ?? {}
            }, "", to);
            break;
        }
        case undefined:
        case 'push': {
            history.pushState({
                renderingData,
                pageState: option?.state ?? {}
            }, "", to);
            break;
        }
    }

    await destroyFragments(fragManager, diffrentFrom);

    const { headFrags, bodyFrag, fragDatas } = fragManager.createFrag(renderingDataElements.slice(diffrentFrom));
    insertHeadFrag(headFrags, fragManager);
    insertBodyFrag(bodyFrag, replacedFrag);

    activeScripts(fragDatas, fragManager);
}

export function addAnchorClickHandler() {
    document.addEventListener('click', (event) => {
        if (event.target && event.target instanceof HTMLAnchorElement && event.target.origin === location.origin && (!event.target.target || event.target.target === "_self")) {
            event.preventDefault();
            goto(event.target.href);
        }
    })
}

export function addPopstateHandler() {
    window.addEventListener('popstate', async (event) => {
        event.preventDefault();
        let renderingData = event.state?.renderingData;
        if (!renderingData) {
            renderingData = await fetch(getRenderingDataRequestUrl(location.href)).then((res) => res.json());
            history.replaceState({
                renderingData,
                pageState: event.state?.pageState ?? {}
            }, "");
        }
        const fragManager = window.__xvelte__.fragManager;
        await fragManager.fragReady;
        const renderingDataElements = [...renderingData.layouts, renderingData.page];
        const diffrentFrom = findDifferentIndex(renderingDataElements, fragManager);
        const replacedFrag = getReplacedFragment(fragManager, diffrentFrom);
        await destroyFragments(fragManager, diffrentFrom);
        const { headFrags, bodyFrag, fragDatas } = fragManager.createFrag(renderingDataElements.slice(diffrentFrom));
        insertHeadFrag(headFrags, fragManager);
        insertBodyFrag(bodyFrag, replacedFrag);
        activeScripts(fragDatas, fragManager);
    })
}

/**
 * RenderingDataElement 들과 FragManger의 fragment들을 비교하여 차이가 나기 시작하는 index를 반환
 * @param elements 
 * @param fragManager 
 * @returns 
 */
function findDifferentIndex(elements: RenderingDataElement[], fragManager: FragManager) {
    let diffrentFrom = 0;
    for (let i = 0; i < Math.max(elements.length, fragManager.fragIds.length); i++) {
        if (elements[i]?.id === fragManager.fragIds?.[i]) {
            diffrentFrom = i + 1;
        }
        else {
            break;
        }
    };
    return diffrentFrom
}

/**
 * 대체할 Fragment를 반환
 */
function getReplacedFragment(fragManager: FragManager, diffrentFrom: number) {
    let replacedFrag = fragManager.fragsDataMap.get(fragManager.fragIds[diffrentFrom])?.body ?? null;
    if (replacedFrag) {
        let marker = document.createElement('template');
        replacedFrag.replaceWith(marker);
        replacedFrag = marker;
    };
    return replacedFrag;
}

/**
 * 하위 fragment부터 제거
 * @param fragManager 
 * @param diffrentFrom 
 */
async function destroyFragments(fragManager: FragManager, diffrentFrom: number) {
    for (let i = fragManager.fragIds.length - 1; i >= diffrentFrom; i--) {
        await fragManager.destroyFrag(fragManager.fragIds[i]);
        fragManager.fragIds.pop();
    }
}

/**
 * Head fragment 삽입 
 */
function insertHeadFrag(headFrags: DocumentFragment[], fragManager: FragManager) {
    headFrags.forEach((hf) => {
        document.head.insertBefore(hf, fragManager.head?.end ?? null);
    });
}

/**
 * Body fragment 삽입
 */
function insertBodyFrag(bodyFrag: HTMLElement | null, replacedFrag: HTMLElement | null) {
    if (bodyFrag) {
        if (replacedFrag) {
            replacedFrag.replaceWith(bodyFrag);
            replacedFrag.remove();
        }
        else {
            document.querySelector('xvelte-body')?.appendChild(bodyFrag);
        }
    };
}

function activeScripts(fragDatas: (FragData & { scripts: HTMLScriptElement[]; })[], fragManager: FragManager) {
    fragDatas.forEach((d) => {
        d.scripts.forEach((script) => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            if (script.src) {
                newScript.src = script.src;
            }
            script.replaceWith(newScript);
            script.remove();
        })
        fragManager.fragIds.push(d.id);
        fragManager.fragsDataMap.set(d.id, d);
    });
}

function getRenderingDataRequestUrl(to: string | URL) {
    if (typeof (to) === "string") {
        to = new URL(to, location.href);
    }

    const renderingDataRequestUrl = new URL('/__xvelte__/navigation', location.origin);
    renderingDataRequestUrl.searchParams.set('to', to.pathname);
    return renderingDataRequestUrl;
}