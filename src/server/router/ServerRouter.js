import { Beam } from "../../arc/class/Beam";
import { deaf, emit, hear, registerExe, mapList, mapSockets, msg } from "../../arc/tools";
import { SocketsGroup } from "./SocketsGroup";

const _privates = new WeakMap();

const enumerable = true;
export class ServerRouter {

    constructor(io) {
        const _p = {
            channels:new Map(),
            groups:new Map(),
            sockets:new Set(),
            welcomes:[],
            farewells:[]
        }

        Object.defineProperties(this, {
            io:{ enumerable, value:io },
            sockets:{ enumerable, get:_=>[..._p.sockets] },
            socketsCount:{ enumerable, get:_=>_p.sockets.size }
        });

        io.on("connection", async socket=>{
            _p.sockets.add(socket);
            _p.channels.forEach((receiver, channel)=>{ hear(socket, channel, receiver); });
            const cleanUp = [];
            socket.on("disconnect", async _=>{
                await mapList(undefined, cleanUp, socket);
                await mapList(undefined, _p.farewells, socket);
                _p.sockets.delete(socket);
            });
            await mapList(cleanUp, _p.welcomes, socket);
        });

        _privates.set(this, _p);

    }

    createGroup(name, grouper) {
        const { groups } = _privates.get(this);
        if (groups.has(name)) { throw Error(msg("Router.createGroup(...)", "allready exist!", {group:name})); }
        const group = new SocketsGroup(this, grouper);
        groups.set(name, group);
        return group;
    }

    getGroup(name) {
        const { groups } = _privates.get(this);
        if (!groups.has(name)) { throw Error(msg("Router.getGroup(...)", "doesn't exist!", {group:name})); }
        return groups.get(name);
    }

    welcome(execute) {
        if (typeof execute !== "function") { throw Error(msg("Router.welcome(...)", "expect function")); }
        return registerExe(_privates.get(this).welcomes, execute);
    }

    farewell(execute) {
        if (typeof execute !== "function") { throw Error(msg("Router.farewell(...)", "expect function")); }
        return registerExe(_privates.get(this).farewells, execute);
    }

    tx(channel, sockets, transceiver, excludeSocket) {
        const rnbl = typeof transceiver === "function";
        const exe = rnbl ? socket=>transceiver(body=>emit(socket, channel, body), socket) : socket=>emit(socket, channel, transceiver);

        return Promise.all(mapSockets(sockets, exe, excludeSocket));
    }

    txBroad(channel, transceiver, excludeSocket) {
        return this.tx(channel, _privates.get(this).sockets, transceiver, excludeSocket);
    }

    rx(channel, receiver) {
        const { channels, sockets } = _privates.get(this);
        if (channels.has(channel)) { throw Error(msg("Router.rx(...)", `allready registered!`, {channel})); }

        channels.set(channel, receiver);
        sockets.forEach(socket=>{ hear(socket, channel, receiver); });

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            sockets.forEach(socket=>{ deaf(socket, channel); });
            return true;
        }
    }

    createBeam(channel, opt={}) {
        return new Beam(this, channel, {
            register:(beam, set)=>{
                this.rx(channel, async (socket, { isSet, state })=>{
                    if (!isSet) { return beam.get(socket); }
                    return set(state, socket);
                });

                beam.watch((state, sourceSocket)=>this.txBroad(channel, state, sourceSocket));
            }
        }, opt);

    }

}