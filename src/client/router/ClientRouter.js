import { emit, hear, msg, validateOnError } from "../../arc/tools";
import { Beam } from "../../arc/beam/Beam";

const _privates = new WeakMap();

export class ClientRouter {

    constructor(socket, onError) {
        onError = validateOnError(onError);
        
        const _p = {
            socket,
            channels:new Map(),
            onError
        }

        Object.defineProperties(this, {
            socket:{ value:socket }
        });

        hear(socket, channel=>_p.channels.get(channel), onError);

        _privates.set(this, _p);
    }
    
    async tx(channel, transceiver) {
        const { socket, onError } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return emit(socket, channel, transceiver, onError); }
        return transceiver(body=>emit(socket, channel, body, onError));
    }

    rx(channel, receiver) {
        const { channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(msg("Router", `allready exist!`, {channel})); }

        channels.set(channel, receiver);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
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