

export class SocketGroups {

    constructor(bridge, grouper) {

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

        Object.defineProperties(this, {
            bridge:{ enumerable:true, value:bridge },
            reset:{ value:_=>{ bySocket.forEach(set); } },
            get:{ value:id=>(byId.has(id) ? [...byId.get(id)] : []) }
        });

        bridge.io.on("connection", socket=>{
            add(grouper(socket), socket);
            socket.on("disconnect", _=>{ remove(bySocket.get(socket), socket); });
        });

    }

    async tx(channel, transceiver, gid) {
        return this.bridge.tx(channel, transceiver, this.get(gid));
    }

}