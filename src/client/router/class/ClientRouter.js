import { deaf, emit, hear } from "../../../arc/tools";
import { Threads } from "../../../arc/Threads";

const _privates = new WeakMap();

export class ClientRouter {

    constructor(socket) {
        const _p = {
            socket,
            threads:new Threads(),
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    async txLock(channel, execute, ...args) {
        return _privates.get(this).threads.txLock(channel, execute, ...args);
    }

    async rxLock(channel, execute, ...args) {
        return _privates.get(this).threads.rxLock(channel, execute, ...args);
    }

    async tx(channel, transceiver) {
        const { socket, threads } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return threads.rxLock(channel, emit, socket, channel, transceiver); }
        return threads.rxLock(channel, _=>transceiver(body=>emit(socket, channel, body)));
    }

    async rx(channel, receiver) {
        const { socket, threads, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bifrost router channel '${channel}' allready exist!`); }

        const rx = (socket, body)=>threads.txLock(channel, receiver, socket, body);
        channels.set(channel, rx);
        hear(socket, channel, rx);

        return _=>{
            channels.delete(channel);
            deaf(socket, channel);
        }
    }

}