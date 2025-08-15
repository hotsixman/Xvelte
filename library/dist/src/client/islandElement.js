var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement } from "lit";
import { property } from "lit/decorators.js";
class IslandElement extends LitElement {
    component;
    fragId;
    async connectedCallback() {
        if (!this.component || !this.fragId)
            return;
        const { default: Component } = await import(this.component);
        const instance = window.__xvelte__.mount(Component, { target: this });
        window.__xvelte__.fragManager.registerComponentInstance(this.fragId, instance);
    }
}
__decorate([
    property({ type: String })
], IslandElement.prototype, "component", void 0);
__decorate([
    property({ type: String, attribute: 'data-frag-id' })
], IslandElement.prototype, "fragId", void 0);
customElements.define('xvelte-island', IslandElement);
//# sourceMappingURL=islandElement.js.map