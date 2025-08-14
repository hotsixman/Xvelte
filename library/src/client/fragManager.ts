import type { FragData, RenderingData } from "../types";

export class FragManager {
    head: { start: Comment, end: Comment } | null = null;
    body: HTMLElement | null = null;
    fragIds: string[] = [];
    fragsDataMap = new Map<string, FragData>();

    fragReady: Promise<void>
    private resolveFragReady: () => void;

    private componentInstanceMap = new Map<string, Record<string, any>[]>();

    constructor() {
        let resolve: () => void = () => void 0;
        this.fragReady = new Promise((res) => {
            resolve = res;
        });
        this.resolveFragReady = resolve;
    }

    findFrags() {
        let headStart: Comment | null = null;
        let headEnd: Comment | null = null;

        let currentStart: Comment | null = null;
        let currentId: string | null = null;

        document.head.childNodes.forEach((node) => {
            if (!(node instanceof Comment)) return;
            if (!node.textContent) return;

            if (node.textContent === "xvelte-head") {
                headStart = node;
            }
            else if (node.textContent === "/xvelte-head") {
                headEnd = node;
            }
            else if (node.textContent.startsWith('xvelte-headfrag')) {
                currentId = node.textContent.replace(/^xvelte\-headfrag\-/, '');
                currentStart = node;
            }
            else if (node.textContent.startsWith('/xvelte-headfrag') && (currentStart && currentId)) {
                const body = document.querySelector(`xvelte-frag[data-frag-id="${currentId}"]`) as HTMLElement;
                this.fragsDataMap.set(currentId, {
                    id: currentId,
                    headStart: currentStart,
                    headEnd: node,
                    body
                });
                this.fragIds.push(currentId);
                currentStart = null;
                currentId = null;
            }
        });

        if (headStart && headEnd) {
            this.head = {
                start: headStart,
                end: headEnd
            }
        }
        this.body = document.querySelector('xvelte-body') as HTMLElement;

        this.resolveFragReady();
    }

    registerComponentInstance(fragId: string, instance: Record<string, any>) {
        let instanceArray = this.componentInstanceMap.get(fragId);
        if (!instanceArray) {
            instanceArray = [];
            this.componentInstanceMap.set(fragId, instanceArray);
        }
        instanceArray.push(instance);
    }

    createFrag(renderingDatas: { id: string, head: string, body: string }[]) {
        const headFrags: DocumentFragment[] = [];
        let bodyFrag: HTMLElement | null = null;
        const fragDatas: (FragData & {scripts: HTMLScriptElement[]})[] = [];
        let slot: HTMLElement | null = null;

        renderingDatas.forEach(data => {
            const scripts: HTMLScriptElement[] = [];

            const headFrag = document.createDocumentFragment();
            const headStart = document.createComment(`xvelte-headfrag-${data.id}`);
            const headEnd = document.createComment(`/xvelte-headfrag-${data.id}`);
            let marker: HTMLElement = document.createElement('template');
            headFrag.appendChild(headStart);
            headFrag.appendChild(marker);
            marker.insertAdjacentHTML('afterend', data.head);
            marker.remove();
            headFrag.appendChild(headEnd);
            headFrags.push(headFrag);

            scripts.push(...headFrag.querySelectorAll('script'));

            const body = document.createElement('xvelte-frag');
            body.setAttribute('data-frag-id', data.id);
            marker = document.createElement('template');
            body.appendChild(marker);
            marker.insertAdjacentHTML('beforebegin', data.body);
            marker.remove();

            scripts.push(...body.querySelectorAll('script'));
            
            if(slot){
                slot.replaceWith(body);
                slot = body.querySelector('xvelte-slot');
            }
            else{
                if(bodyFrag){
                    throw new Error("No `xvelte-slot` element");
                }
                slot = body.querySelector('xvelte-slot');
                bodyFrag = body;
            }

            fragDatas.push({
                id: data.id,
                headStart,
                headEnd,
                body,
                scripts
            })
        });

        return {headFrags, bodyFrag, fragDatas};
    }

    async destroyFrag(fragId: string) {
        await this.destroyComponentInstances(fragId);
        const fragData = this.fragsDataMap.get(fragId);
        if (fragData) {
            let removeFlag = false;
            let removeTarget: ChildNode[] = []
            for (const child of document.head.childNodes) {
                if (removeFlag) {
                    const last = child === fragData.headEnd;
                    removeTarget.push(child);
                    if (last) break;
                }
                else if (child === fragData.headStart) {
                    removeTarget.push(child);
                    removeFlag = true;
                }
            }
            removeTarget.forEach((node) => node.remove())

            fragData.body.remove();
            this.fragsDataMap.delete(fragData.id);
        }
    }

    async destroyComponentInstances(fragId: string) {
        const instanceArray = this.componentInstanceMap.get(fragId);
        if (!instanceArray) return;
        for (const instance of instanceArray) {
            await window.__xvelte__.unmount(instance);
        }
        this.componentInstanceMap.delete(fragId);
    }
}

const fragManager = new FragManager();
window.addEventListener('DOMContentLoaded', () => fragManager.findFrags());

export { fragManager }