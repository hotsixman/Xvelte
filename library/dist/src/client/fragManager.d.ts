import type { FragData } from "../types.js";
export declare class FragManager {
    head: {
        start: Comment;
        end: Comment;
    } | null;
    body: HTMLElement | null;
    fragIds: string[];
    fragsDataMap: Map<string, FragData>;
    fragReady: Promise<void>;
    private resolveFragReady;
    private componentInstanceMap;
    constructor();
    /**
     * 첫 페이지 로드 시 dom에서 xvelte fragment들을 찾아놓기. 이후 페이지 이동 시 사용.
     */
    findFrags(): void;
    /**
     * 클라이언트 렌더링 컴포넌트를 등록
     * @param fragId
     * @param instance
     */
    registerComponentInstance(fragId: string, instance: Record<string, any>): void;
    /**
     * `RenderingDataElement` 요소들을 fragment로 변환할 수 있는 형식으로 변환
     */
    createFrag(renderingDataElements: {
        id: string;
        head: string;
        body: string;
    }[]): {
        headFrags: DocumentFragment[];
        bodyFrag: null;
        fragDatas: (FragData & {
            scripts: HTMLScriptElement[];
        })[];
    };
    /**
     * dom과 fragManager에서 fragment 제거
     * @param fragId
     */
    destroyFrag(fragId: string): Promise<void>;
    /**
     * 클라이언트 컴포넌트 인스턴스를 제거
     */
    destroyComponentInstances(fragId: string): Promise<void>;
}
declare const fragManager: FragManager;
export { fragManager };
