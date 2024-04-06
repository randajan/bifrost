
const _privates = new Map(); //only one

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
            channels:new Map(),
            translator:c=>c
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    channelTranslate(translator) {
        const _p = _privates.get(this);
        const { channels, socket, threadLock } = _p;
        const trFrom = _p.translator;
        const trTo = _p.translator = translator;

        channels.forEach((receiver, channel)=>{
            const from = trFrom(channel);
            const to = trTo(channel);

            if (from === to) { return; }

            deaf(socket, from);
            hear(socket, to, receiver, threadLock);
        });
    }

    async threadLock(channel, execute, ...args) {
        return _privates.get(this).threadLock(channel, execute, ...args);
    }

    async tx(channel, transceiver) {
        const { socket, threadLock, translator } = _privates.get(this);
        return threadLock(channel, async _=>{
            const rnbl = typeof transceiver === "function";
            const ch = translator(channel);
            return rnbl ? transceiver(body=>emit(socket, ch, body)) : emit(socket, ch, transceiver);
        });
    }

    async rx(channel, receiver) {
        const { socket, threadLock, channels, translator } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bridge channel '${channel}' allready exist!`); }

        channels.set(channel, receiver);
        hear(socket, translator(channel), receiver, threadLock);

        return _=>{
            channels.delete(channel);
            const ch = _privates.get(this).translator(channel);
            deaf(socket, ch);
        }
    }

}