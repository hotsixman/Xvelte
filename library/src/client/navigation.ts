import type { FragData } from "../types";

class XvelteFragManager {
    head: { start: Comment, end: Comment } | null = null;
    body: HTMLElement | null = null;
    fragsDatas: FragData[] = [];

    fragReady: Promise<void>
    private resolveFragReady: () => void;

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
                const body = document.querySelector(`xvelte-frag[data-component-id=${currentId}]`) as HTMLElement;
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
}

const xvelteFragManager = new XvelteFragManager();
window.addEventListener('DOMContentLoaded', () => xvelteFragManager.findFrags());

async function goto(url: string | URL) {
    await xvelteFragManager.fragReady;
    const destination = new URL(url, location.href);
}