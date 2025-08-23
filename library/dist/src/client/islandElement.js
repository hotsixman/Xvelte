var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import * as devalue from 'devalue';
class IslandElement extends LitElement {
    component;
    fragId;
    propsString;
    on;
    observer;
    /**
     * `on` 프로퍼티에 따라 각기 다른 시점에 component를 마운트
     */
    async connectedCallback() {
        if (!this.component || !this.fragId)
            return;
        const fragId = this.fragId;
        const Component = import(this.component).then(module => module.default);
        switch (this.on) {
            case 'visible': {
                const intersectionTarget = this.children[0] ?? createTempChild(this);
                this.observer = new IntersectionObserver(async (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            this.clearInnerHtml();
                            this.mountComponent(await Component, fragId);
                            this.observer?.disconnect();
                            this.observer = undefined;
                        }
                    }
                });
                this.observer.observe(intersectionTarget);
                break;
                function createTempChild(parent) {
                    const tempChild = document.createElement('div');
                    tempChild.style.width = "0px";
                    tempChild.style.height = "0px";
                    tempChild.style.visibility = "hidden";
                    parent.appendChild(tempChild);
                    return tempChild;
                }
            }
            case 'click': {
                let clicked = false;
                this.addEventListener('click', async () => {
                    if (clicked)
                        return;
                    this.clearInnerHtml();
                    this.mountComponent(await Component, fragId);
                    clicked = true;
                });
                break;
            }
            case 'mouseenter': {
                let mouseentered = false;
                this.addEventListener('mouseenter', async () => {
                    if (mouseentered)
                        return;
                    this.clearInnerHtml();
                    this.mountComponent(await Component, fragId);
                    mouseentered = true;
                });
                break;
            }
            default: {
                this.clearInnerHtml();
                this.mountComponent(await Component, fragId);
                break;
            }
        }
    }
    /**
     * IntersectionObserver가 존재하면 disconnect
     */
    disconnectedCallback() {
        this.observer?.disconnect();
    }
    /**
     * 컴포넌트 마운트
     */
    async mountComponent(Component, fragId) {
        const props = this.propsString ? devalue.parse(this.propsString) : {};
        const instance = window.__xvelte__.mount(Component, { target: this, props });
        window.__xvelte__.fragManager.registerComponentInstance(fragId, instance);
    }
    /**
     * 내부 HTML 제거
     */
    clearInnerHtml() {
        this.innerHTML = '';
    }
}
__decorate([
    property({ type: String })
], IslandElement.prototype, "component", void 0);
__decorate([
    property({ type: String, attribute: 'data-frag-id' })
], IslandElement.prototype, "fragId", void 0);
__decorate([
    property({ type: String, attribute: 'props' })
], IslandElement.prototype, "propsString", void 0);
__decorate([
    property({ type: String, attribute: 'ev' })
], IslandElement.prototype, "on", void 0);
customElements.define('xvelte-island', IslandElement);
//# sourceMappingURL=islandElement.js.map