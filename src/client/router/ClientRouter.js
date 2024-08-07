import { deaf, emit, hear, msg } from "../../arc/tools";
import { Beam } from "../../arc/class/Beam";

const _privates = new WeakMap();

export class ClientRouter {

    constructor(socket) {
        const _p = {
            socket,
            channels:new Map()
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        _privates.set(this, _p);
    }
    
    async tx(channel, transceiver) {
        const { socket } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return emit(socket, channel, transceiver); }
        return transceiver(body=>emit(socket, channel, body));
    }

    rx(channel, receiver) {
        const { socket, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(msg("Router", `allready exist!`, {channel})); }

        channels.set(channel, receiver);
        hear(socket, channel, receiver);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            deaf(socket, channel);
            return true;
        }
    }

    createBeam(channel, opt={}) {
        return new Beam(this, channel, {
            pull:async _=>{
                return this.tx(channel, {isSet:false});
            },
            push:(state)=>{
                return this.tx(channel, {isSet:true, state});
            },
            register:(beam, set)=>{
                this.rx(channel, (socket, state)=>set(state));
            }
        }, opt);
    }

}