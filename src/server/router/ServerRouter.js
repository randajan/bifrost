import { solid, solids, virtuals } from "@randajan/props";

import { emit, hear, mapList, mapSockets, msg, validateOnError, validFn } from "../../arc/tools";
import { SocketsGroup } from "./SocketsGroup";
import { MapSet } from "@randajan/group-map/set";


const _privates = new WeakMap();

export class ServerRouter {

    constructor(io, onError) {
        onError = validateOnError(onError);

        const _p = {
            channels:new Map(),
            sockets:new Set(),
            handlers:new MapSet(),
            welcomes:[],
            farewells:[],
            onError
        }

        solids(this, { io }, false);

        virtuals(this, {
            sockets:_=>[..._p.sockets],
            socketsCount:_=>_p.sockets.size
        })

        io.on("connection", async socket=>{
            _p.sockets.add(socket);
            const deaf = hear(socket, channel=>_p.channels.get(channel), onError);
            socket.on("disconnect", async _=>{
                deaf(socket);
                await mapList(_p.handlers.get("bye"), socket);
                _p.sockets.delete(socket);
            });
            await mapList(_p.handlers.get("hi"), socket);
        });

        _privates.set(this, _p);

    }

    on(event, execute) {
        validFn(execute, "ServerRouter.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _=>handlers.delete(event, execute);
    }

    async tx(channel, sockets, transceiver, excludeSocket) {
        const { onError } = _privates.get(this);
        const rnbl = typeof transceiver === "function";
        const exe = rnbl ? socket=>transceiver(body=>emit(socket, channel, body, onError), socket) : socket=>emit(socket, channel, transceiver, onError);

        return Promise.all(mapSockets(sockets, exe, excludeSocket));
    }

    async txBroad(channel, transceiver, excludeSocket) {
        return this.tx(channel, _privates.get(this).sockets, transceiver, excludeSocket);
    }

    rx(channel, receiver) {
        const { channels } = _privates.get(this);
        if (channels.has(channel)) { throw new Error(msg("ServerRouter.rx(...)", `allready registered!`, {channel})); }

        channels.set(channel, receiver);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            return true;
        }
    }

    createGroup(getSocketGroupId) {
        return new SocketsGroup(this, getSocketGroupId);
    }

    createBeam() {
        throw new Error(msg("createBeam", "was moved to @randajan/bifrost/server/beam"));
    }

}