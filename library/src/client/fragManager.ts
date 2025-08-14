import { type Component } from "svelte";
import type { FragData } from "../types";

class FragManager {
    head: { start: Comment, end: Comment } | null = null;
    body: HTMLElement | null = null;
    fragsDatas: FragData[] = [];

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
                const body = document.querySelector(`xvelte-frag[data-frag-id=${currentId}]`) as HTMLElement;
                this.fragsDatas.push({
                    id: currentId,
                    headStart: currentStart,
                    headEnd: node,
                    body
                })
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

    registerComponentInstance(fragId: string, instance: Record<string, any>){
        let instanceArray = this.componentInstanceMap.get(fragId);
        if(!instanceArray){
            instanceArray = [];
            this.componentInstanceMap.set(fragId, instanceArray);
        }
        instanceArray.push(instance);
    }

    async destroyComponentInstances(fragId: string){
        const instanceArray = this.componentInstanceMap.get(fragId);
        if(!instanceArray) return;
        for(const instance of instanceArray){
            console.log(await window.__xvelte__.unmount(instance));
        }
    }
}

const fragManager = new FragManager();
window.addEventListener('DOMContentLoaded', () => fragManager.findFrags());

export { fragManager }