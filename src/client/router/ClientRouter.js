import { solid, solids, virtual } from "@randajan/props";


import { emit, hear, mapList, msg, validateOnError, validFn } from "../../arc/tools";
import { MapSet } from "@randajan/group-map/set";


const _privates = new WeakMap();

/**
 * @preserve
 * Client-side Bifrost router for one Socket.IO client socket.
 *
 * @property {Object} socket Socket.IO client socket used by this router.
 * @property {"online"|"offline"|"pending"} status Current connection status.
 */
export class ClientRouter {

    /**
     * @preserve
     * @param {Object} socket Socket.IO client socket.
     * @param {Function} [onError] Error handler for send/receive failures.
     * @param {boolean} [exposeCause=false] Exposes serialized receiver errors to the remote caller.
     */
    constructor(socket, onError, exposeCause=false) {
        onError = validateOnError(onError);

        const _p = {
            socket,
            status:socket.connected ? "online" : "offline",
            handlers: new MapSet(),
            channels: new Map(),
            onError
        }

        const setStatus = to => {
            const from = _p.status;
            if (from == to) { return; }
            _p.status = to;
            mapList(_p.handlers.get(to), socket, to, from);
        }

        solids(this, { socket });
        virtual(this, "status", _ => _p.status);

        hear(socket, channel => _p.channels.get(channel), onError, exposeCause);

        socket.on("connect", _ => setStatus("online"));
        socket.on("disconnect", _ => setStatus("offline"));
        socket.on("connect_error", _ => setStatus("offline"));

        socket.io.on("reconnect_attempt", _ => setStatus("pending"));
        socket.io.on("reconnect_error", _ => setStatus("pending"));
        socket.io.on("reconnect_failed", _ => setStatus("offline"));

        _privates.set(this, _p);
    }

    /**
     * @preserve
     * Subscribes to client status events.
     *
     * @param {"online"|"offline"|"pending"} event Status event name.
     * @param {Function} execute Listener callback.
     * @returns {Function} Unsubscribe function.
     */
    on(event, execute) {
        validFn(execute, "ClientRouter.on(event, ...)");
        const { handlers } = _privates.get(this);
        handlers.add(event, execute);
        return _ => handlers.delete(event, execute);
    }

    /**
     * @preserve
     * Sends data to a remote receiver on the selected channel.
     *
     * @param {string} channel Channel name.
     * @param {*|Function} transceiver Data body, or a function that receives a `send(body)` callback.
     * @returns {Promise<*>} Remote receiver reply.
     */
    async tx(channel, transceiver) {
        const { socket, onError } = _privates.get(this);
        const rnbl = typeof transceiver === "function";

        if (!rnbl) { return emit(socket, channel, transceiver, onError); }
        return transceiver(body => emit(socket, channel, body, onError));
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
        if (channels.has(channel)) { throw new Error(msg("Router", `already exists!`, { channel })); }

        channels.set(channel, receiver);

        return _ => {
            if (!channels.has(channel)) { return false; }
            channels.delete(channel);
            return true;
        }
    }

    /**
     * @preserve
     * @deprecated Import `createBeam` from `@randajan/bifrost/client/beam`.
     * @throws {Error}
     */
    createBeam() {
        throw new Error(msg("createBeam", "has been moved to @randajan/bifrost/client/beam"));
    }

}
