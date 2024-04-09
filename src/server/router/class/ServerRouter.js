import { deaf, emit, hear, registerExe, mapList } from "../../../arc/tools";
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
            sockets:{ enumerable, get:_=>[..._p.sockets] }
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
        if (groups.has(name)) { throw Error(`Bifrost router group '${name}' allready exist!`); }
        const group = new SocketsGroup(this, grouper);
        groups.set(name, group);
        return group;
    }

    getGroup(name) {
        const { groups } = _privates.get(this);
        if (!groups.has(name)) { throw Error(`Bifrost router group '${name}' doesn't exist!`); }
        return groups.get(name);
    }

    welcome(execute) {
        if (typeof execute !== "function") { throw Error(`Bifrost router welcome(...) expect function`); }
        return registerExe(_privates.get(this).welcomes, execute);
    }

    farewell(execute) {
        if (typeof execute !== "function") { throw Error(`Bifrost router farewell(...) expect function`); }
        return registerExe(_privates.get(this).farewells, execute);
    }

    tx(channel, transceiver, sockets) {
        const rnbl = typeof transceiver === "function";
        if (!sockets) { sockets = this.sockets; }
        return Promise.all(sockets.map(async socket=>{
            return rnbl ? transceiver(body=>emit(socket, channel, body), socket) : emit(socket, channel, transceiver);
        }));
    }

    rx(channel, receiver) {
        const { channels, sockets } = _privates.get(this);
        if (channels.has(channel)) { throw Error(`Bifrost router rx channel '${channel}' allready registered!`); }

        channels.set(channel, receiver);
        sockets.forEach(socket=>{ hear(socket, channel, receiver); });

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            sockets.forEach(socket=>{ deaf(socket, channel); });
            return true;
        }
    }

}