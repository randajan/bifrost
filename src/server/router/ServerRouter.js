import { solid, solids, virtuals } from "@randajan/props";

import { emit, hear, mapList, mapSockets, msg, validateOnError, validFn } from "../../arc/tools";
import { SocketsGroup } from "./SocketsGroup";
import { MapSet } from "@randajan/group-map/set";


const _privates = new WeakMap();

/**
 * @preserve
 * Server-side Bifrost router for a Socket.IO server instance.
 *
 * @property {Object} io Socket.IO server instance used by this router.
 * @property {Object[]} sockets Connected Socket.IO sockets.
 * @property {number} socketsCount Number of connected sockets.
 */
export class ServerRouter {

    /**
     * @preserve
     * @param {Object} io Socket.IO server instance.
     * @param {Function} [onError] Error handler for send/receive failures.
     * @param {boolean} [exposeCause=false] Exposes serialized receiver errors to the remote caller.
     */
    constructor(io, onError, exposeCause=false) {
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
            const deaf = hear(socket, channel=>_p.channels.get(channel), onError, exposeCause);
            socket.on("disconnect", async _=>{
                deaf(socket);
                await mapList(_p.handlers.get("bye"), socket);
                _p.sockets.delete(socket);
            });
            await mapList(_p.handlers.get("hi"), socket);
        });

        _privates.set(this, _p);

    }

    /**
     * @preserve
     * Subscribes to server socket lifecycle events.
     *
     * @param {"hi"|"bye"} event Server event name.
     * @param {Function} execute Listener callback.
     * @returns {Function} Unsubscribe function.
     */
    on(event, execute) {
        validFn(execute, "ServerRouter.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _=>handlers.delete(event, execute);
    }

    /**
     * @preserve
     * Sends data to selected sockets.
     *
     * @param {string} channel Channel name.
     * @param {Iterable<Object>} sockets Target sockets.
     * @param {*|Function} transceiver Data body, or a function that receives `send(body)` and the target socket.
     * @param {Object} [excludeSocket] Socket to skip.
     * @returns {Promise<Array<*>>} Remote receiver replies.
     */
    async tx(channel, sockets, transceiver, excludeSocket) {
        const { onError } = _privates.get(this);
        const rnbl = typeof transceiver === "function";
        const exe = rnbl ? socket=>transceiver(body=>emit(socket, channel, body, onError), socket) : socket=>emit(socket, channel, transceiver, onError);

        return Promise.all(mapSockets(sockets, exe, excludeSocket));
    }

    /**
     * @preserve
     * Sends data to all connected sockets.
     *
     * @param {string} channel Channel name.
     * @param {*|Function} transceiver Data body, or a function that receives `send(body)` and the target socket.
     * @param {Object} [excludeSocket] Socket to skip.
     * @returns {Promise<Array<*>>} Remote receiver replies.
     */
    async txBroad(channel, transceiver, excludeSocket) {
        return this.tx(channel, _privates.get(this).sockets, transceiver, excludeSocket);
    }

    /**
     * @preserve
     * Registers a receiver for a channel.
     *
     * @param {string} channel Channel name.
     * @param {Function} receiver Receiver callback.
     * @returns {Function} Unregister function.
     */
    rx(channel, receiver) {
        const { channels } = _privates.get(this);
        if (channels.has(channel)) { throw new Error(msg("ServerRouter.rx(...)", `already registered!`, {channel})); }

        channels.set(channel, receiver);

        return _=>{
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            return true;
        }
    }

    /**
     * @preserve
     * Creates a server-side socket group.
     *
     * @param {Function} getSocketGroupId Resolves the group id for a socket.
     * @returns {SocketsGroup}
     */
    createGroup(getSocketGroupId) {
        return new SocketsGroup(this, getSocketGroupId);
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
