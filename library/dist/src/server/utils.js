import { createHash } from 'node:crypto';
export function generateHash(text) {
    return createHash('sha-256').update(text).digest('hex');
}
//# sourceMappingURL=utils.js.map