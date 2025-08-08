import {
  append,
  append_styles,
  child,
  delegate,
  from_html,
  get,
  reset,
  set_text,
  state,
  template_effect,
  update
} from "./chunk-CC4V63LO.js";

// node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/svelte/src/internal/disclose-version.js
if (typeof window !== "undefined") {
  ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(PUBLIC_VERSION);
}

// src/app/page/test.svelte?client
var on_click = (_, count) => update(count);
var root = from_html(`<button class="svelte-54tn4w"> </button>`);
var $$css = {
  hash: "svelte-54tn4w",
  code: "button.svelte-54tn4w{color:red;}"
};
function Test($$anchor) {
  append_styles($$anchor, $$css);
  let count = state(0);
  var button = root();
  button.__click = [on_click, count];
  var text = child(button, true);
  reset(button);
  template_effect(() => set_text(text, get(count)));
  append($$anchor, button);
}
delegate(["click"]);
export {
  Test as default
};
