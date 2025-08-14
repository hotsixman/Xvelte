import { LitElement } from "lit";
import { property } from "lit/decorators.js";

class IslandElement extends LitElement{
    @property({type: String})
    component?: string;
    @property({type: String, attribute: 'data-frag-id'})
    fragId?: string;
    

    async connectedCallback() {
        if(!this.component || !this.fragId) return;
        const {default: Component} = await import(this.component)
        const instance = window.__xvelte__.mount(Component, {target: this});
        window.__xvelte__.fragManager.registerComponentInstance(this.fragId, instance);
    }   
}

customElements.define('xvelte-island', IslandElement);