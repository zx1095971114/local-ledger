interface Result<T> {
    code: number;
    msg?: string;
    data?: T;
}

function ok<T>(msg?: string, data?: T): Result<T> {
    return {
        code: 200,
        msg: msg ?  msg : "操作成功",
        data: data
    };
}

function error<T>(msg?: string, data?: T): Result<T> {
    return {
        code: 500,
        msg: msg,
        data: data
    };
}

export { Result, ok, error };

