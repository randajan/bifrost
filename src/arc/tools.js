const _bifrostEvent = "__$$BifrostDataChannel__"; ///do not change

class RemoteError extends Error {
    constructor({ message, stack }={}) {
        super(message);
        this.stack = stack;
    }
}

export const msg = (method, text, descObj={})=>{
    let desc = "";
    for (let i in descObj) { desc += (desc ? ", " : "") + ` ${i} '${descObj[i]}'`; }
    return `Bifrost ${method}${desc} ${text}`;
};

export const validFn = (fn, name)=>{
    if (typeof fn === "function") { return fn; }
    throw new Error(msg(name, "expected a function"));
}

export const validSet = (any, name)=>{
    if (any instanceof Set) { return any; }
    throw new Error(msg(name, "expected an Set"));
}

export const validStr = (str, name)=>{
    if (typeof str !== "string") { throw new Error(msg(name, "expects a string")); }
    if (str.length <= 0) { throw new Error(msg(name, "require non empty string")); }
    return str;
}

export const validEnum = (any, enm=[], name)=>{
    if (enm.includes(any)) { return any; }
    throw new Error(msg(name, `expects one of '${enm.join(",")}' but got '${any}' instead`));
}

export const validResultAsNonEmptySet = (fn, name)=>{
    return async (...arg)=>{
        const r = await fn(...arg);
        if (r == null) { return; }
        validSet(r, name);
        if (r.size > 0) { return r; }
    }
}

const packError = err=>{
    if (!(err instanceof new Error)) { return err; }
    const { message, stack } = err;
    return { message, stack };
}

const unpackError = (errPack)=>{
    return errPack ? new RemoteError(errPack) : undefined;
}

export const validateOnError = (onError)=>{
    if (typeof onError === "function") { return onError; }
    return ()=>{};
}

export const emit = async (socket, channel, body, onError)=>{
    return new Promise((res, rej)=>{
        socket.emit(_bifrostEvent, {channel, body}, (ok, response)=>{
            if (ok) { return res(response); }
            const cause = unpackError(response);
            const err = new Error(`Remote error '${channel}'`, { cause });
            rej(err);
            onError(err);
        });
    });
}

export const hear = (socket, getChannel, onError, exposeCause=false)=>{
    const listener = async ({channel, body}, ack)=>{
        const receiver = getChannel(channel);
        if (!receiver) { return ack(false, { message:"Not found" }); }
        try { await ack(true, await receiver(socket, body)); }
        catch (err) {
            await ack(false, exposeCause ? packError(err) : undefined);
            onError(err);
        }
    }

    socket.on(_bifrostEvent, listener);
    return _=>socket.off(_bifrostEvent, listener);
}

export const mapList = async (list, ...args)=>{
    if (!list) { return; }
    for (const exe of [...list]) {
        try { await exe(...args); } catch {}
    }
}

export const mapSockets = (sockets, execute, except)=>{
    if (!sockets) { return []; }
    const result = [];
    for (const socket of sockets) {
        if (socket === except) { continue; }
        result.push(execute(socket));
    }
    return result;
}



