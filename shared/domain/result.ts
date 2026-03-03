interface Result<T> {
    code: number;
    msg?: string;
    data?: T;
}

function ok(msg?: string, data?: any): Result<any> {
    return {
        code: 200,
        msg: msg ?  msg : "操作成功",
        data: data
    };
}

function error(msg?: string, data?: any): Result<any> {
    return {
        code: 500,
        msg: msg,
        data: data
    };
}

export { Result, ok, error };

