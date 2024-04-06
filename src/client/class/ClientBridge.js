import { deaf, emit, hear } from "../tools";
import { Threads } from "./Threads";

const _privates = new WeakMap();

export class ClientBridge {

    constructor(socket) {
        const _p = {
            socket,
            txThreads:new Threads(),
            rxThreads:new Threads(),
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }

    async txLock(channel, execute, ...args) {
        return _privates.get(this).txThreads.lock(channel, execute, ...args);
    }

    async rxLock(channel, execute, ...args) {
        return _privates.get(this).rxThreads.lock(channel, execute, ...args);
    }

    async tx(channel, transceiver) {
        const { socket, rxThreads } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return rxThreads.lock(channel, emit, socket, channel, transceiver); }
        return rxThreads.lock(channel, _=>transceiver(body=>emit(socket, channel, body)));
    }

    async rx(channel, receiver) {
        const { socket, txThreads, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bridge channel '${channel}' allready exist!`); }

        channels.set(channel, receiver);
        hear(socket, channel, receiver, txThreads);

        return _=>{
            channels.delete(channel);
            deaf(socket, channel);
        }
    }

}