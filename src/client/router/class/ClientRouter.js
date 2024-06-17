import { deaf, emit, hear } from "../../../arc/tools";
import { createThreadsLock } from "../../../arc/threadsLock";

const _privates = new WeakMap();

export class ClientRouter {

    constructor(socket) {
        const _p = {
            socket,
            txLock:createThreadsLock(),
            rxLock:createThreadsLock(),
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    async txLock(lock, execute, ...args) {
        return _privates.get(this).txLock(lock, execute, ...args);
    }

    async rxLock(lock, execute, ...args) {
        return _privates.get(this).rxLock(lock, execute, ...args);
    }

    async tx(channel, transceiver, opt={}) {
        const { lock } = opt;
        const { socket, rxLock } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return rxLock(lock || channel, emit, socket, channel, transceiver); }
        return rxLock(lock || channel, _=>transceiver(body=>emit(socket, channel, body)));
    }

    async rx(channel, receiver, opt={}) {
        const { lock } = opt;
        const { socket, txLock, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bifrost router channel '${channel}' allready exist!`); }

        const rx = (socket, body)=>txLock(lock || channel, receiver, socket, body);
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