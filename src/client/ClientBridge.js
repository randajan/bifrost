
const _privates = new WeakMap();

const createThreads = _=>{
    const t = new Set();
    return async (name, exe, ...args)=>{
        if (t.has(name)) { return; }
        t.add(name);
        let res, err;
        try { res = await exe(...args); } catch(e) { err = e; }
        t.delete(name);
        if (err) { throw err; } else { return res; }
    }
}

const emit = async (socket, channel, body)=>{
    return new Promise((res, rej)=>{
        socket.emit(channel, body, (ok, body)=>{
            if (ok) { res(body); } else { rej(body); }
        });
    });
};

const hear = (socket, channel, receiver, threadLock)=>{
    socket.on(channel, async (body, ack)=>{
        try { await ack(true, await threadLock(channel, receiver, socket, body)); }
        catch(err) {
            console.warn(err);
            await ack(false, `FE > ${err}`);
        }
    });
}

const deaf = (socket, channel)=>{ socket.off(channel); }

export class ClientBridge {

    constructor(socket) {
        const _p = {
            socket,
            threadLock:createThreads(),
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    async threadLock(channel, execute, ...args) {
        return _privates.get(this).threadLock(channel, execute, ...args);
    }

    async tx(channel, transceiver) {
        const { socket, threadLock } = _privates.get(this);
        return threadLock(channel, async _=>{
            const rnbl = typeof transceiver === "function";
            return rnbl ? transceiver(body=>emit(socket, channel, body)) : emit(socket, channel, transceiver);
        });
    }

    async rx(channel, receiver) {
        const { socket, threadLock, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bridge channel '${channel}' allready exist!`); }

        channels.set(channel, receiver);
        hear(socket, channel, receiver, threadLock);

        return _=>{
            channels.delete(channel);
            deaf(socket, channel);
        }
    }

}