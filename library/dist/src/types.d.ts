export type * from './client/types.js';
export type * from './server/types.js';
export type RenderingData = {
    layouts: RenderingDataElement[];
    page: RenderingDataElement;
};
export type RenderingDataElement = {
    id: string;
    head: string;
    body: string;
};
