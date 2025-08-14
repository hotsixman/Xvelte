export type * from './client/types';
export type * from './server/types';

export type RenderingData = {
    layouts: {
        id: string;
        head: string;
        body: string;
    }[];
    page: {
        id: string;
        head: string;
        body: string;
    };
}