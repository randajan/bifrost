import { deaf, emit, hear } from "../../arc/tools";
import { Beam, defaultStateAdapter } from "../../arc/class/Beam";

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

    async lock(key, execute, ...args) {
        return _privates.get(this).txLock(key, execute, ...args);
    }

    async tx(channel, transceiver) {
        const { socket } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return emit(socket, channel, transceiver); }
        return transceiver(body=>emit(socket, channel, body));
    }

    async rx(channel, receiver) {
        const { socket, channels } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bifrost router channel '${channel}' allready exist!`); }

        channels.set(channel, receiver);
        hear(socket, channel, receiver);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            deaf(socket, channel);
            return true;
        }
    }

    createBeam(channel, stateAdapter) {
        return new Beam({
            pull:async (getState)=>{
                return this.tx(channel, {isSet:false});
            },
            push:(newState, getState)=>{
                return this.tx(channel, {isSet:true, state:newState});
            },
            register:(beam, set)=>{
                this.rx(channel, (socket, state)=>set(state));

                Object.defineProperties(beam, {
                    router:{ value:this },
                    channel:{ enumerable:true, value:channel}
                });
            }
        }, defaultStateAdapter(stateAdapter));
    }

}