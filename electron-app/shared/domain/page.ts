
interface Page<T> {
    current?: number,
    size?: number,
    total?: number,
    rows?: T[],
    isPage: boolean,
    orderBy?: Order[]
}

interface Order {
    column: string,
    order: "asc" | "desc"
}

function transToOffsetWay(pageInfo: Page<any>): { limit: number; offset: number }{
    let current = pageInfo.current ?? 1;
    let size = pageInfo.size ?? 10;
    let offset = (current - 1) * size
    return{
        limit: size,
        offset: offset
    }
}

function transToCurrentWay(offsetWay: { limit: number; offset: number }): { current: number; size: number}{
    return {
        current: offsetWay.offset / offsetWay.limit + 1,
        size: offsetWay.limit
    }
}

export type { Page, Order };
export { transToOffsetWay, transToCurrentWay };