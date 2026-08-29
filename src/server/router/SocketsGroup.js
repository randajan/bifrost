import { solid, solids } from "@randajan/props";

import { MapSet } from "@randajan/group-map/set";

import { mapList, msg, validFn, validResultAsNonEmptySet } from "../../arc/tools";



const _privates = new WeakMap();

/**
 * @preserve
 * Server-side socket group that maps sockets to group ids.
 *
 * Grouped routers are useful when several sockets should share the same
 * server-owned state or receive the same server broadcasts.
 */
export class SocketsGroup {

    /**
     * @preserve
     * @param {Object} router Parent server router.
     * @param {Function} getSocketGroupId Resolves the group id for a socket.
     */
    constructor(router, getSocketGroupId) { //, hasOneToMany=false

        const hasOneToMany = !!hasOneToMany;

        if (typeof getSocketGroupId != "function") { msg("SocketGroup", `getSocketGroupId must be a function.`); }
        if (hasOneToMany) {
            getSocketGroupId = validResultAsNonEmptySet(getSocketGroupId, "getSocketGroupId(...)");
        }

        const _p = {};

        _p.byId = new MapSet();
        _p.bySocket = new Map();
        _p.handlers = new MapSet();

        const byIdOp = !hasOneToMany
            ? (op, id, socket)=>_p.byId[op](id, socket)
            : (op, ids, socket)=>{
                if (!ids) { _p.byId[op](undefined, socket); return; }
                for (const id of ids) { _p.byId[op](id, socket); }
            };
        
        const byIdCompare = !hasOneToMany
            ? (t, f)=>t === f
            : (t, f)=>t === f || (t?.size === f?.size && [...f].every(v => t.has(v)));


        _p.add = async socket=>{
            const toId = await getSocketGroupId(socket);
            _p.bySocket.set(socket, toId);
            byIdOp("add", toId, socket);
            mapList(_p.handlers.get("hi"), socket, toId);
        }

        _p.remove = socket=>{
            const fromId = _p.bySocket.get(socket);
            _p.bySocket.delete(socket);
            byIdOp("delete", fromId, socket);
            mapList(_p.handlers.get("bye"), socket, fromId);
        }

        _p.reset = async socket=>{
            const fromId = _p.bySocket.get(socket);
            const toId = await getSocketGroupId(socket);
            if (byIdCompare(toId, fromId)) { return; }
            _p.bySocket.set(socket, toId);
            byIdOp("delete", fromId, socket);
            byIdOp("add", toId, socket);
            mapList(_p.handlers.get("reset"), socket, toId, fromId);
        }

        solids(this, {
            router,
            hasOneToMany,
            getSocketGroupId,
            getSocketsCount:(groupId)=>(_p.byId.get(groupId)?.size || 0)
        });

        router.on("hi", async socket=>{ await _p.add(socket); });
        router.on("bye", async socket=>{ await _p.remove(socket); });

        _privates.set(this, _p);

    }

    /**
     * @preserve
     * Subscribes to group lifecycle events.
     *
     * @param {"hi"|"bye"|"reset"} event Group event name.
     * @param {Function} execute Listener callback.
     * @returns {Function} Unsubscribe function.
     */
    on(event, execute) {
        validFn(execute, "Group.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _=>handlers.delete(event, execute);
    }

    /**
     * @preserve
     * Re-evaluates the group id for every known socket.
     *
     * @returns {Promise<void>}
     */
    async resetAll() {
        const { bySocket, reset } = _privates.get(this);
        await Promise.all([...bySocket.keys()].map(reset));
    }

    /**
     * @preserve
     * Re-evaluates the group id for selected sockets.
     *
     * @param {Iterable<Object>} sockets Sockets to reset.
     * @returns {Promise<void>}
     */
    async resetSockets(sockets) {
        const { reset } = _privates.get(this);
        await Promise.all([...sockets].map(reset));
    }

    /**
     * @preserve
     * Re-evaluates the group id for one socket.
     *
     * @param {Object} socket Socket to reset.
     * @returns {Promise<void>}
     */
    async resetSocket(socket) {
        const { reset } = _privates.get(this);
        await reset(socket);
    }

    /**
     * @preserve
     * Re-evaluates sockets currently assigned to a group id.
     *
     * @param {*} groupId Group id to reset.
     * @returns {Promise<void>}
     */
    async reset(groupId) {
        const { byId, reset } = _privates.get(this);
        const sockets = byId.get(groupId);
        if (!sockets) { return; }
        await Promise.all([...sockets].map(reset));
    }

    /**
     * @preserve
     * Returns sockets currently assigned to a group id.
     *
     * @param {*} groupId Group id.
     * @returns {Object[]} Matching sockets.
     */
    get(groupId) {
        const { byId } = _privates.get(this);
        const sockets = byId.get(groupId);
        return !sockets ? [] : [ ...sockets ];
    }

    /**
     * @preserve
     * Sends data to sockets currently assigned to a group id.
     *
     * @param {string} channel Channel name.
     * @param {*} groupId Group id.
     * @param {*|Function} transceiver Data body, or a function that receives `send(body)` and the target socket.
     * @param {Object} [exceptSocket] Socket to skip.
     * @returns {Promise<Array<*>>|undefined} Remote receiver replies.
     */
    async tx(channel, groupId, transceiver, exceptSocket) {
        const { byId } = _privates.get(this);
        const sockets = byId.get(groupId);
        if (!sockets) { return; }
        return this.router.tx(channel, sockets, transceiver, exceptSocket);
    }

    //TODO txBroad now doesnt work with hasOneToMany
    /**
     * @preserve
     * Broadcasts to the group of the source socket.
     *
     * @param {string} channel Channel name.
     * @param {*|Function} transceiver Data body, or a function that receives `send(body)` and the target socket.
     * @param {Object} socket Source socket used to resolve the group id.
     * @param {boolean} [excludeSocket=true] Whether to skip the source socket.
     * @returns {Promise<Array<*>>|undefined} Remote receiver replies.
     */
    async txBroad(channel, transceiver, socket, excludeSocket=true) {
        const { bySocket } = _privates.get(this);
        if (!bySocket.has(socket)) { return; }
        const groupId = bySocket.get(socket);
        return this.tx(channel, groupId, transceiver, excludeSocket ? socket : undefined);
    }

    /**
     * @preserve
     * Registers a grouped receiver for a channel.
     *
     * @param {string} channel Channel name.
     * @param {Function} receiver Receiver callback.
     * @returns {Function} Unregister function.
     */
    rx(channel, receiver) {
        const { bySocket } = _privates.get(this);
        return this.router.rx(channel, (socket, data)=>{
            if (!bySocket.has(socket)) { return; }
            const groupId = bySocket.get(socket);
            return receiver(socket, groupId, data);
        });
    }

    /**
     * @preserve
     * @deprecated Import `createBeam` from `@randajan/bifrost/server/beam`.
     * @throws {Error}
     */
    createBeam() {
        throw new Error(msg("createBeam", "has been moved to @randajan/bifrost/server/beam"));
    }

}
