import { solid, solids } from "@randajan/props";

import createVault from "@randajan/vault-kit";
import { MapSet } from "@randajan/group-map/set";

import { mapList, msg, validFn } from "../../arc/tools";




const _privates = new WeakMap();


export class SocketsGroup {

    constructor(router, getSocketGroupId) {

        if (typeof getSocketGroupId != "function") { msg("SocketGroup", `getSocketGroupId must be typeof function.`); }

        const _p = { getSocketGroupId };

        _p.byId = new MapSet();
        _p.bySocket = new Map();
        _p.handlers = new MapSet();

        _p.add = async socket=>{
            const toId = await getSocketGroupId(socket);
            _p.bySocket.set(socket, toId);
            _p.byId.add(toId, socket);
            mapList(_p.handlers.get("hi"), socket, toId);
        }

        _p.remove = socket=>{
            const fromId = _p.bySocket.get(socket);
            _p.byId.delete(fromId, socket);
            _p.bySocket.delete(socket);
            mapList(_p.handlers.get("bye"), socket, fromId);
        }

        _p.reset = async socket=>{
            const fromId = _p.bySocket.get(socket);
            const toId = await getSocketGroupId(socket);
            if (fromId === toId) { return; }
            _p.bySocket.set(socket, toId);
            _p.byId.delete(fromId, socket);
            _p.byId.add(toId, socket);
            mapList(_p.handlers.get("reset"), socket, toId, fromId);
        }

        solids(this, { router });

        router.on("hi", socket=>{ _p.add(socket); });
        router.on("bye", socket=>{ _p.remove(socket); });

        _privates.set(this, _p);

    }

    on(event, execute) {
        validFn(execute, "Group.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _=>handlers.delete(event, execute);
    }

    async resetAll() {
        const { bySocket, reset } = _privates.get(this);
        await Promise.all([...bySocket].map(reset));
    }

    async resetSockets(sockets) {
        const { reset } = _privates.get(this);
        await Promise.all([...sockets].map(reset));
    }

    async resetSocket(socket) {
        const { reset } = _privates.get(this);
        await reset(socket);
    }

    async reset(groupId) {
        const { byId, reset } = _privates.get(this);
        const sockets = byId.get(groupId);
        if (!sockets) { return; }
        await Promise.all([...sockets].map(reset));
    }

    get(groupId) {
        const { byId } = _privates.get(this);
        const sockets = byId.get(groupId);
        return !sockets ? [] : [ ...sockets ];
    }

    async tx(channel, groupId, transceiver, exceptSocket) {
        const { byId } = _privates.get(this);
        const sockets = byId.get(groupId);
        if (!sockets) { return; }
        return this.router.tx(channel, sockets, transceiver, exceptSocket);
    }

    async txBroad(channel, transceiver, socket, excludeSocket=true) {
        const { bySocket } = _privates.get(this);
        const groupId = bySocket.get(socket);
        if (groupId == null) { return; }
        return this.tx(channel, groupId, transceiver, excludeSocket ? socket : undefined);
    }

    rx(channel, receiver) {
        const { bySocket } = _privates.get(this);
        return this.router.rx(channel, (socket, data)=>{
            const groupId = bySocket.get(socket);
            if (groupId == null) { return; }
            return receiver(socket, groupId, data);
        });
    }

    vaultChannel(channel, vault) {
        const _p = _privates.get(this);

        this.router.rx(channel, async (socket, { isSet, data })=>{
            const groupId = await _p.getSocketGroupId(socket);
            if (!isSet) { return vault.get(groupId, socket); }
            return vault.set(data, groupId, socket);
        });

        this.on("reset", async (socket, groupId)=>{
            this.router.tx(channel, [socket], await vault.get(groupId, socket));
        });

        const txStatuses = ["init", "ready", "expired"];
        vault.on(({status, data}, groupId, sourceSocket)=>{
            if (!txStatuses.includes(status)) { return; }
            if (!sourceSocket) { return this.tx(channel, groupId, data); }
            else { return this.txBroad(channel, data, sourceSocket); }
        });
        
        return vault;
    }

    createBeam(channel, opt={}) {
        return this.vaultChannel(channel, createVault({ ...opt, hasMany:true }));
    }

}