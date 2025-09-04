import {createHash} from 'node:crypto';

export function generateHash(text: string) {
    return createHash('sha-256').update(text).digest('hex');
}