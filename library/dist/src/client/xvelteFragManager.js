class XvelteFragManager {
    head = null;
    body = null;
    fragsDatas = [];
    fragReady;
    resolveFragReady;
    constructor() {
        let resolve = () => void 0;
        this.fragReady = new Promise((res) => {
            resolve = res;
        });
        this.resolveFragReady = resolve;
    }
    findFrags() {
        let headStart = null;
        let headEnd = null;
        let currentStart = null;
        let currentId = null;
        document.head.childNodes.forEach((node) => {
            if (!(node instanceof Comment))
                return;
            if (!node.textContent)
                return;
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
                const body = document.querySelector(`xvelte-frag[data-component-id=${currentId}]`);
                this.fragsDatas.push({
                    id: currentId,
                    headStart: currentStart,
                    headEnd: node,
                    body
                });
                currentStart = null;
                currentId = null;
            }
        });
        if (headStart && headEnd) {
            this.head = {
                start: headStart,
                end: headEnd
            };
        }
        this.body = document.querySelector('xvelte-body');
        this.resolveFragReady();
    }
}
const fragManager = new XvelteFragManager();
window.addEventListener('DOMContentLoaded', () => fragManager.findFrags());
export { fragManager };
//# sourceMappingURL=xvelteFragManager.js.map