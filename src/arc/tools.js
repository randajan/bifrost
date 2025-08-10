const _bifrostEvent = "__$$BifrostDataChannel__"; ///do not change

export const msg = (method, text, descObj={})=>{
    let desc = "";
    for (let i in descObj) { desc += (desc ? ", " : "") + ` ${i} '${descObj[i]}'`; }
    return `Bifrost ${method}${desc} ${text}`;
};

export const validFn = (fn, name)=>{
    if (typeof fn === "function") { return fn; }
    throw Error(msg(name, "expect function"));
}

const packError = err=>{
    if (!(err instanceof Error)) { return err; }
    const e = {};
    for (let prop in Object.getOwnPropertyDescriptors(err)) { e[prop] = err[prop]; }
    const { channel } = err;
    const extend = msg("", "remote", {channel});
    e.message = extend+" "+e.message;
    e.stack = extend+" "+e.stack;
    return e;
}

const unpackError = err=>{
    if (!err?.message) { return err; }
    const e = new Error(err.message);
    for (let prop in err) { e[prop] = err[prop]; }
    return e;
}

export const validateOnError = (onError)=>{
    if (typeof onError === "function") { return onError; }
    return ()=>{};
}

export const emit = async (socket, channel, body, onError)=>{
    return new Promise((res, rej)=>{
        socket.emit(_bifrostEvent, {channel, body}, (ok, response)=>{
            if (ok) { return res(response); }
            const err = unpackError(response);
            rej(err);
            onError(err);
        });
    });
}

export const hear = (socket, getChannel, onError)=>{
    const listener = async ({channel, body}, ack)=>{
        const receiver = getChannel(channel);
        try { await ack(true, !receiver ? undefined : await receiver(socket, body)); }
        catch (err) {
            err.channel = channel;
            await ack(false, packError(err));
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