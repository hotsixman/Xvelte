import { randomUUID } from "node:crypto";
import { XvelteApp } from "./src/server/XvelteApp.js";
export default XvelteApp;
export { XvelteApp };
export function randomId(prefix) {
    return `${prefix || 'element'}-${randomUUID()}`;
}
//# sourceMappingURL=index.js.map