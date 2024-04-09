
const _privates = new WeakMap();

export class SocketsGroup {

    constructor(router, grouper) {

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
            const toId = grouper(socket);
            if (fromId === toId) { return; }
            remove(fromId, socket);
            add(toId, socket);
        }

        Object.defineProperty(this, "router", {
            value:router, enumerable:true
        });

        router.welcome(socket=>{
            add(grouper(socket), socket);
            return _=>{ remove(bySocket.get(socket), socket); };
        });

        _privates.set(this, { byId, bySocket, remove, add, set });

    }

    reset() {
        const { bySocket, set } = _privates.get(this);
        bySocket.forEach(set);
    }

    get(id) {
        const { byId } = _privates.get(this);
        return byId.has(id) ? [...byId.get(id)] : [];
    }

    async tx(channel, transceiver, id) {
        return this.router.tx(channel, transceiver, this.get(id));
    }

}