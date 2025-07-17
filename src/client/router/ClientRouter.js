import { solid, solids, virtual } from "@randajan/props";
import createVault from "@randajan/vault-kit";

import { emit, hear, mapList, msg, validateOnError, validFn } from "../../arc/tools";
import { MapSet } from "@randajan/group-map/set";


const _privates = new WeakMap();


export class ClientRouter {

    constructor(socket, onError) {
        onError = validateOnError(onError);
        

        const _p = {
            socket,
            status:socket.connected ? "online" : "offline",
            handlers:new MapSet(),
            channels:new Map(),
            onError
        }

        const setStatus = (status)=>{
            _p.status = status;
            mapList(_p.handlers.get(status), socket, status);
        }

        solids(this, { socket });
        virtual(this, "status", _=>_p.status);

        hear(socket, channel=>_p.channels.get(channel), onError);

        socket.on("connect", _=>setStatus("online"));
        socket.on("disconnect", _=>setStatus("offline"));
        socket.on("connect_error", _=>setStatus("offline"));

        socket.io.on("reconnect_attempt", _=>setStatus("pending"));
        socket.io.on("reconnect_error", _=>setStatus("pending"));
        socket.io.on("reconnect_failed", _=>setStatus("offline"));

        _privates.set(this, _p);
    }

    on(event, execute) {
        validFn(execute, "ClientRouter.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _=>handlers.delete(event, execute);
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

    vaultRemote(channel) {
        return {
            pull:_=>this.tx(channel, {isSet:false}),
            push:data=>this.tx(channel, {isSet:true, data}),
            init:set=>this.rx(channel, (socket, data)=>set(data))
        }
    }

    createBeam(channel, opt={}) {
        const vault = createVault({
            ...opt,
            remote:this.vaultRemote(channel)
        });

        this.on("online", _=>{ vault.reset(); });

        return vault;
    }

}