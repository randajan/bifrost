import { SocketGroups } from "./SocketsGroups";

const _privates = new Map(); //only one

const emit = async (socket, channel, body)=>{
    return new Promise((res, rej)=>{
        socket.emit(channel, body, (ok, body)=>{
            if (ok) { res(body); } else { rej(body); }
        });
    });
}

const hear = (socket, channel, receiver)=>{
    socket.on(channel, async (body, ack)=>{
        try { await ack(true, await receiver(socket, body)); }
        catch(err) {
            console.warn(err);
            await ack(false, `BE > ${err}`);
        }
    });
}

const deaf = (socket, channel)=>{ socket.off(channel); }

const enumerable = true;
export class ServerBridge {

    constructor(io) {
        const _p = {
            channels:new Map(),
            groups:new Map(),
            sockets:new Set(),
            translator:c=>c
        }

        Object.defineProperties(this, {
            io:{ enumerable, value:io },
            sockets:{ enumerable, get:_=>[..._p.sockets] }
        });

        io.on("connection", socket=>{
            _p.sockets.add(socket);
            _p.channels.forEach((receiver, channel)=>{ hear(socket, _p.translator(channel), receiver); });
            socket.on("disconnect", _=>{ _p.sockets.delete(socket); });
        });

        _privates.set(this, _p);

    }

    channelTranslate(translator) {
        const _p = _privates.get(this);
        const { channels, sockets } = _p;
        const trFrom = _p.translator;
        const trTo = _p.translator = translator;

        channels.forEach((receiver, channel)=>{
            const from = trFrom(channel);
            const to = trTo(channel);

            if (from === to) { return; }

            sockets.forEach((socket)=>{
                deaf(socket, from);
                hear(socket, to, receiver);
            });
        });
    }

    createGroup(name, grouper) {
        const { groups } = _privates.get(this);
        if (groups.has(name)) { throw Error(`Bridge group '${name}' allready exist!`); }
        const group = new SocketGroups(this, grouper);
        groups.set(name, group);
        return group;
    }

    getGroup(name) {
        const { groups } = _privates.get(this);
        if (!groups.has(name)) { throw Error(`Bridge group '${name}' doesn't exist!`); }
        return groups.get(name);
    }

    tx(channel, transceiver, sockets) {
        const { translator } = _privates.get(this);
        const rnbl = typeof transceiver === "function";
        const ch = translator(channel);
        if (!sockets) { sockets = this.sockets; }
        return Promise.all(sockets.map(async socket=>{
            return rnbl ? transceiver(body=>emit(socket, ch, body), socket) : emit(socket, ch, transceiver);
        }));
    }

    rx(channel, receiver) {
        const { channels, sockets, translator } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bridge rx channel '${channel}' allready registered!`); }

        channels.set(channel, receiver);
        sockets.forEach(socket=>{ hear(socket, translator(channel), receiver); });

        return _=>{
            channels.delete(channel);
            const ch = _privates.get(this).translator(channel);
            sockets.forEach(socket=>{ deaf(socket, ch); });
        }
    }

}