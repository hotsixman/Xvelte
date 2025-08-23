export type FragData = {
    id: string;
    headStart: Comment,
    body: HTMLElement
    headEnd: Comment,
}

export type NavigatingData = {
    from: URL;
    to: URL;
}

export type PageData = {
    url: URL;
    state: Record<string, any>;
}