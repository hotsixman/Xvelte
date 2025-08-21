import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import * as devalue from 'devalue';
import type { Component } from "svelte";

class IslandElement extends LitElement {
    @property({ type: String })
    component?: string;
    @property({ type: String, attribute: 'data-frag-id' })
    fragId?: string;
    @property({ type: String, attribute: 'props' })
    propsString?: string;
    @property({ type: String, attribute: 'ev' })
    on?: 'visible' | 'click' | 'mouseenter'

    private observer?: IntersectionObserver;

    /**
     * `on` 프로퍼티에 따라 각기 다른 시점에 component를 마운트
     */
    async connectedCallback() {
        if (!this.component || !this.fragId) return;
        const fragId = this.fragId;
        const Component = import(this.component).then(module => module.default as Component);
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

                function createTempChild(parent: Element) {
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
                    if (clicked) return;
                    this.clearInnerHtml();
                    this.mountComponent(await Component, fragId);
                    clicked = true;
                });
                break;
            }
            case 'mouseenter': {
                let mouseentered = false;
                this.addEventListener('mouseenter', async () => {
                    if (mouseentered) return;
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
    disconnectedCallback(): void {
        this.observer?.disconnect();
    }

    /**
     * 컴포넌트 마운트
     */
    async mountComponent(Component: Component, fragId: string) {
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

customElements.define('xvelte-island', IslandElement);