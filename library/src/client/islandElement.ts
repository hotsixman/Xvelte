import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import * as devalue from 'devalue';

class IslandElement extends LitElement {
    @property({ type: String })
    component?: string;
    @property({ type: String, attribute: 'data-frag-id' })
    fragId?: string;
    @property({ type: String, attribute: 'props' })
    propsString?: string;

    async connectedCallback() {
        if (!this.component || !this.fragId) return;
        const { default: Component } = await import(this.component);
        const props = this.propsString ? devalue.parse(this.propsString) : {};
        const instance = window.__xvelte__.mount(Component, { target: this, props });
        window.__xvelte__.fragManager.registerComponentInstance(this.fragId, instance);
    }
}

customElements.define('xvelte-island', IslandElement);