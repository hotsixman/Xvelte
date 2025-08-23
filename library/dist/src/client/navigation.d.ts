export declare function goto(to: string | URL, option?: {
    type?: 'push' | 'replace';
    state?: Record<string, any>;
}): Promise<void>;
export declare function addAnchorClickHandler(): void;
export declare function addPopstateHandler(): void;
export declare function stealHistoryApi(): {
    historyApi: {
        replaceState: (data: Record<string, any>, url?: string | URL | null) => void;
        pushState: (data: Record<string, any>, url?: string | URL | null) => void;
        original: {
            replaceState: (data: any, unused: string, url?: string | URL | null) => void;
            pushState: (data: any, unused: string, url?: string | URL | null) => void;
        };
    };
    originalHistoryApi: {
        replaceState: (data: any, unused: string, url?: string | URL | null) => void;
        pushState: (data: any, unused: string, url?: string | URL | null) => void;
    };
};
