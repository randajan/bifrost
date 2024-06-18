import { deaf, emit, hear } from "../../../arc/tools";
import { createThreadsLock } from "../../../arc/threadsLock";

const _privates = new WeakMap();

export class ClientRouter {

    constructor(socket) {
        const _p = {
            socket,
            threadsLock:createThreadsLock(),
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    async lock(key, execute, ...args) {
        return _privates.get(this).txLock(key, execute, ...args);
    }

    async tx(channel, transceiver, opt={}) {
        const { lock } = opt;
        const { socket, threadsLock } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return threadsLock(lock || channel, emit, socket, channel, transceiver); }
        return threadsLock(lock || channel, _=>transceiver(body=>emit(socket, channel, body)));
    }

    async rx(channel, receiver, opt={}) {
        const { lock } = opt;
        const { socket, channels, threadsLock } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bifrost router channel '${channel}' allready exist!`); }

        const rx = (socket, body)=>threadsLock(lock || channel, receiver, socket, body);
        channels.set(channel, rx);
        hear(socket, channel, rx);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            deaf(socket, channel);
            return true;
        }
    }

}