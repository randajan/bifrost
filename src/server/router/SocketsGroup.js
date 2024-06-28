import { Beam, defaultStatesAdapter } from "../../arc/class/Beam";

const _privates = new WeakMap();

export class SocketsGroup {

    constructor(router, getSocketGroupId) {

        const byId = new Map();
        const bySocket = new Map();

        const remove = (fromId, socket)=>{
            const from = byId.get(fromId);
            from.delete(socket);
            if (!from.size) { byId.delete(fromId); }
            bySocket.delete(socket);
        }

        const add = (toId, socket)=>{
            let to = byId.get(toId);
            if (!to) { byId.set(toId, to = new Set()); }
            to.add(socket);
            bySocket.set(socket, toId);
        }

        const set = (fromId, socket)=>{
            const toId = getSocketGroupId(socket);
            if (fromId === toId) { return; }
            remove(fromId, socket);
            add(toId, socket);
        }

        const get = id=>byId.has(id) ? byId.get(id) : [];
        const reset = _=>bySocket.forEach(set);

        Object.defineProperty(this, "router", {
            value:router, enumerable:true
        });

        router.welcome(socket=>{
            add(getSocketGroupId(socket), socket);
            return _=>{ remove(bySocket.get(socket), socket); };
        });

        _privates.set(this, { getSocketGroupId, add, set, get, reset });

    }

    reset() {
        _privates.get(this).reset();
    }

    get(groupId) {
        return [..._privates.get(this).get(groupId)];
    }

    async tx(channel, groupId, transceiver, exceptSocket) {
        const sockets = _privates.get(this).get(groupId);
        return this.router.tx(channel, sockets, transceiver, exceptSocket);
    }

    async txBroad(channel, transceiver, socket, excludeSocket=true) {
        const socketId = _privates.get(this).getSocketGroupId(socket);
        return this.tx(channel, socketId, transceiver, excludeSocket ? socket : undefined);
    }

    createBeam(channel, stateAdapter) {
        const _p = _privates.get(this);

        return new Beam({
            register:(beam, set)=>{
                this.router.rx(channel, async (socket, { isSet, state })=>{
                    const groupId = _p.getSocketGroupId(socket);
                    if (!isSet) { return beam.get(groupId, socket); }
                    return set(state, groupId, socket);
                });

                beam.watch((state, groupId, sourceSocket)=>this.txBroad(channel, state, sourceSocket));

                Object.defineProperties(beam, {
                    router:{ value:this },
                    channel:{ enumerable:true, value:channel}
                });
            }
        }, defaultStatesAdapter(stateAdapter));
    }

}