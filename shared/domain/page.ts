
interface Page<T> {
    current?: number,
    size?: number,
    total?: number,
    rows?: T;
}

export {Page}