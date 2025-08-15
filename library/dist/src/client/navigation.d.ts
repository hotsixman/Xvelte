export declare function goto(to: string | URL, option?: {
    type?: 'push' | 'replace' | 'none';
}): Promise<void>;
export declare function addAnchorClickHandler(): void;
export declare function addPopstateHandler(): void;
