import { Beam } from "../../arc/beam/Beam";
import { mapList, msg, registerExe } from "../../arc/tools";

const _privates = new WeakMap();

const validateSocketGroupProp = socketGroupProp=>{
    const type = typeof socketGroupProp;
    if (type === "function") { return [socketGroupProp]; }
    if (type === "string") { return [socket=>socket[socketGroupProp], socketGroupProp]; }
    throw Error(msg("SocketGroup", `socketGroupProp must be typeof function or string. Got '${type}' instead`)); 
}

export class SocketsGroup {

    constructor(router, socketGroupProp) {

        const [getSocketGroupId, groupProp] = validateSocketGroupProp(socketGroupProp);

        const byId = new Map();
        const bySocket = new Map();
        const watchers = [];

        const remove = (fromId, socket, propagate=true)=>{
            const from = byId.get(fromId);
            if (!from) { return; }
            from.delete(socket);
            if (!from.size) { byId.delete(fromId); }
            bySocket.delete(socket);
            if (propagate) { mapList(undefined, watchers, socket, "farewell", undefined, fromId); }
        }

        const add = (toId, socket, propagate=true)=>{
            let to = byId.get(toId);
            if (!to) { byId.set(toId, to = new Set()); }
            to.add(socket);
            bySocket.set(socket, toId);
            if (propagate) { mapList(undefined, watchers, socket, "welcome", toId); }
        }

        const set = (fromId, socket)=>{
            const toId = getSocketGroupId(socket);
            if (fromId === toId) { return; }
            remove(fromId, socket, false);
            add(toId, socket, false);
            mapList(undefined, watchers, socket, "reset", toId, fromId);
        }

        const get = id=>byId.has(id) ? byId.get(id) : (new Set());

        Object.defineProperty(this, "router", {
            value:router, enumerable:true
        });

        router.welcome(socket=>{
            if (groupProp) {
                let currentId = socket[groupProp];
                Object.defineProperty(socket, groupProp, {
                    enumerable:true,
                    get:_=>currentId,
                    set:toId=>{
                        const fromId = currentId;
                        currentId = toId;
                        set(fromId, socket);
                    }
                });
            }
            add(getSocketGroupId(socket), socket);
            return _=>{ remove(bySocket.get(socket), socket); };
        });

        _privates.set(this, { bySocket, byId, getSocketGroupId, add, set, get, watchers });

    }

    watch(watcher) {
        const { watchers} = _privates.get(this);
        return registerExe(watchers, watcher);
    }

    reset(sockets) {
        const { bySocket, set } = _privates.get(this);
        if (!sockets) { bySocket.forEach(set); return; }
        for (const socket of sockets) {
            if (bySocket.has(socket)) { set(bySocket.get(socket), socket); }
        }
    }

    resetSocket(socket) {
        return this.reset([socket]);
    }

    resetGroup(groupId) {
        const { get } = _privates.get(this);
        return this.reset(get(groupId));
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

    rx(channel, receiver) {
        const _p = _privates.get(this);
        return this.router.rx(channel, (socket, data)=>receiver(socket, _p.getSocketGroupId(socket), data));
    }

    createBeam(channel, opt={}) {
        const _p = _privates.get(this);

        return new Beam(this, channel, {
            isMultiState:true,
            register:(beam, set)=>{

                this.router.rx(channel, async (socket, { isSet, state })=>{
                    const groupId = _p.getSocketGroupId(socket);
                    if (!isSet) { return beam.get(groupId, socket); }
                    return set(state, groupId, socket);
                });

                this.watch(async (socket, event, groupId)=>{
                    if (event !== "reset") { return; }
                    this.router.tx(channel, [socket], await beam.get(groupId, socket));
                });

                beam.watch((state, groupId, sourceSocket)=>{
                    if (!sourceSocket) { return this.tx(channel, groupId, state); }
                    else { return this.txBroad(channel, state, sourceSocket); }
                });
            }
        }, opt);
    }

}