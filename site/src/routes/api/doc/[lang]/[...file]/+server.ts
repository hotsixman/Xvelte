import type { AnyRequestEvent, RequestEvent } from '@hotsixman/xvelte/types';
import * as fs from 'fs';
import * as path from 'path';

const docsRoot = path.resolve(process.cwd(), './docs');

export function GET(event: RequestEvent<'/doc/:lang/*file'>) {
    console.log('[API /api/doc] Received request');
    console.log('[API /api/doc] CWD:', process.cwd());
    console.log('[API /api/doc] Docs Root:', docsRoot);

    const { lang, file } = event.params;
    console.log('[API /api/doc] Params:', { lang, file });

    if (!lang || !file) {
        event.status = 400;
        return JSON.stringify({ error: 'Language and file path are required.' });
    }

    // Basic security check to prevent path traversal
    if (file.includes('..')) {
        event.status = 400;
        return JSON.stringify({ error: 'Invalid file path.' });
    }

    const filePath = path.join(docsRoot, lang, ...file);
    console.log('[API /api/doc] Constructed File Path:', filePath);

    try {
        const fileExists = fs.existsSync(filePath);
        console.log('[API /api/doc] File Exists?:', fileExists);

        if (fileExists && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            event.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return content;
        } else {
            event.status = 404;
            return JSON.stringify({
                error: 'File not found.',
                checkedPath: filePath
            });
        }
    } catch (error: any) {
        event.status = 500;
        return JSON.stringify({
            error: 'Failed to read file.',
            message: error.message,
            checkedPath: filePath
        });
    }
}