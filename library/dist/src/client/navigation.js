import { get } from "svelte/store";
import {} from "../types.js";
import { loadPageData } from "./store.js";
const getReplaceState = () => window.__xvelte__.history.original.replaceState;
const getPushState = () => window.__xvelte__.history.original.pushState;
export async function goto(to, option) {
    const fragManager = window.__xvelte__.fragManager;
    await fragManager.ready;
    to = pathToUrl(to);
    setNavigatingStore(to);
    const renderingDataRequestUrl = getRenderingDataRequestUrl(to);
    const renderingData = await fetch(renderingDataRequestUrl).then((res) => res.json());
    const renderingDataElements = [...renderingData.layouts, renderingData.page];
    const diffrentFrom = findDifferentIndex(renderingDataElements, fragManager);
    const replacedFrag = getReplacedFragment(fragManager, diffrentFrom);
    switch (option?.type) {
        case 'replace': {
            getReplaceState()({
                renderingData,
                pageState: option?.state ?? {}
            }, "", to);
            break;
        }
        case undefined:
        case 'push': {
            getPushState()({
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
    navigationEnded();
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
    window.addEventListener('popstate', async (event) => {
        event.preventDefault();
        const to = pathToUrl(location.href);
        setNavigatingStore(to);
        let renderingData = event.state?.renderingData;
        if (!renderingData) {
            renderingData = await fetch(getRenderingDataRequestUrl(to)).then((res) => res.json());
            getReplaceState()({
                renderingData,
                pageState: event.state?.pageState ?? {}
            }, "");
        }
        const fragManager = window.__xvelte__.fragManager;
        await fragManager.ready;
        const renderingDataElements = [...renderingData.layouts, renderingData.page];
        const diffrentFrom = findDifferentIndex(renderingDataElements, fragManager);
        const replacedFrag = getReplacedFragment(fragManager, diffrentFrom);
        await destroyFragments(fragManager, diffrentFrom);
        const { headFrags, bodyFrag, fragDatas } = fragManager.createFrag(renderingDataElements.slice(diffrentFrom));
        insertHeadFrag(headFrags, fragManager);
        insertBodyFrag(bodyFrag, replacedFrag);
        activeScripts(fragDatas, fragManager);
        navigationEnded();
    });
}
export function stealHistoryApi() {
    const replaceState = window.history.replaceState.bind(window.history);
    const pushState = window.history.pushState.bind(window.history);
    const originalHistoryApi = {
        replaceState,
        pushState
    };
    const historyApi = {
        replaceState(data, url) {
            replaceState({
                renderingData: history.state?.renderingData,
                pageState: data
            }, "", url);
            window.__xvelte__.page.set(loadPageData());
        },
        pushState(data, url) {
            pushState({
                renderingData: history.state?.renderingData,
                pageState: data
            }, "", url);
            window.__xvelte__.page.set(loadPageData());
        }
    };
    window.history.replaceState = function (data, unused, url) {
        console.error("Using 'history.replaceState' may cause Xvelte’s system to malfunction. Please use the 'replaceState' function from @hotsixman/xvelte/client instead.");
        replaceState(data, unused, url);
    };
    window.history.pushState = (data, unused, url) => {
        console.error("Using 'history.pushState' may cause Xvelte’s system to malfunction. Please use the 'pushState' function from @hotsixman/xvelte/client instead.");
        pushState(data, unused, url);
    };
    return { historyApi, originalHistoryApi };
}
/**
 * RenderingDataElement 들과 FragManger의 fragment들을 비교하여 차이가 나기 시작하는 index를 반환
 * @param elements
 * @param fragManager
 * @returns
 */
function findDifferentIndex(elements, fragManager) {
    let diffrentFrom = 0;
    for (let i = 0; i < Math.max(elements.length, fragManager.fragIds.length); i++) {
        if (elements[i]?.id === fragManager.fragIds?.[i]) {
            diffrentFrom = i + 1;
        }
        else {
            break;
        }
    }
    ;
    return diffrentFrom;
}
/**
 * 대체할 Fragment를 반환
 */
function getReplacedFragment(fragManager, diffrentFrom) {
    let replacedFrag = fragManager.fragsDataMap.get(fragManager.fragIds[diffrentFrom])?.body ?? null;
    if (replacedFrag) {
        let marker = document.createElement('template');
        replacedFrag.replaceWith(marker);
        replacedFrag = marker;
    }
    ;
    return replacedFrag;
}
/**
 * 하위 fragment부터 제거
 * @param fragManager
 * @param diffrentFrom
 */
async function destroyFragments(fragManager, diffrentFrom) {
    for (let i = fragManager.fragIds.length - 1; i >= diffrentFrom; i--) {
        await fragManager.destroyFrag(fragManager.fragIds[i]);
        fragManager.fragIds.pop();
    }
}
/**
 * Head fragment 삽입
 */
function insertHeadFrag(headFrags, fragManager) {
    headFrags.forEach((hf) => {
        document.head.insertBefore(hf, fragManager.head?.end ?? null);
    });
}
/**
 * Body fragment 삽입
 */
function insertBodyFrag(bodyFrag, replacedFrag) {
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
}
function activeScripts(fragDatas, fragManager) {
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
function pathToUrl(to) {
    if (typeof (to) === "string") {
        return new URL(to, location.href);
    }
    return to;
}
function getRenderingDataRequestUrl(to) {
    if (typeof (to) === "string") {
        to = new URL(to, location.href);
    }
    const renderingDataRequestUrl = new URL('/__xvelte__/navigation', location.origin);
    renderingDataRequestUrl.searchParams.set('to', to.pathname);
    return renderingDataRequestUrl;
}
function setNavigatingStore(to) {
    window.__xvelte__.navigating.set({
        from: new URL(get(window.__xvelte__.page).url),
        to
    });
}
function navigationEnded() {
    window.__xvelte__.navigating.set(null);
    window.__xvelte__.page.set(loadPageData());
}
//# sourceMappingURL=navigation.js.map