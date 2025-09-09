import type { AnyRequestEvent } from '@hotsixman/xvelte/types';
import * as fs from 'fs';
import * as path from 'path';

// The process runs from the 'site' directory root
const docsRoot = path.resolve(process.cwd(), './docs');

function getFiles(dir: string): string[] {
    try {
        const dirents = fs.readdirSync(dir, { withFileTypes: true });
        const files = dirents
            .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
            .map(dirent => dirent.name);
        return files;
    } catch (e) {
        // If the directory doesn't exist, return an empty array
        return [];
    }
}

export function GET(event: AnyRequestEvent) {
    try {
        const enFiles = getFiles(path.join(docsRoot, 'en'));
        const koFiles = getFiles(path.join(docsRoot, 'ko'));

        const structure = {
            en: enFiles.sort(),
            ko: koFiles.sort(),
        };

        event.setHeader('Content-Type', 'application/json');
        return JSON.stringify(structure);
    } catch (error) {
        event.status = 500;
        return JSON.stringify({ error: 'Failed to read docs directory' });
    }
}