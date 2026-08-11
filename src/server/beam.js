import createVault from "@randajan/vault-kit";
import { wirePush, wireReset, validateWire, wireDestroy } from "../arc/wire.js";
import { validEnum } from "../arc/tools.js";


const _txStatuses = new Set(["ready", "expired", "init", "destroyed"]);


const formatStatusCfg = (vault, beamOpt) => {
    const { readyOp, expireOp, resetOp, destroyOp } = (beamOpt || {});

    const { hasRemote } = vault;

    const wPush = ["none", "reset", "push"];
    const wBatch = hasRemote ? [...wPush, "renew"] : wPush;

    return Object.freeze({
        ready: validEnum(readyOp ?? "push", wPush, "readyOp"),
        init: validEnum(resetOp ?? (hasRemote ? "renew" : "push"), wBatch, "resetOp"),
        expired: validEnum(expireOp ?? "none", wBatch, "expireOp"),
        destroyed: validEnum(destroyOp ?? "destroy", [...wPush, "destroy"], "destroyOp"),
    })
}

const isRouterGroup = bifrost => {
    const { getSocketGroupId, getSocketsCount } = bifrost;
    return !!(getSocketGroupId && getSocketsCount);
}

const vaultChRx = (router, channel, vault, prefixer) => {

    const getPort = !prefixer
        ? path => vault.at(...path)
        : async (path, socket) => vault.at(await prefixer(socket), ...path);

    return router.rx(channel, async (socket, wire) => {
        const { mode, data, path } = validateWire(wire, ["push", "pull"]);
        const port = await getPort(path, socket);
        return mode === "push" ? port.set(data, { socket }) : port.get({ socket });
    });
}

const vaultChOn = (vault, cleanUp, filter, tx, statusCfg = {}, getWirePath = (p => p)) => {

    vault.on(ctx => {
        const { status, path, data, batch } = ctx;
        if (!_txStatuses.has(status)) { return; }

        if (status === "destroyed" && !path.length && (!batch || batch === "start")) {
            cleanUp();
        }

        if (!filter(path)) { return; } //no listeners

        const c = statusCfg[status];

        if (!c || c === "none") { return; }

        if (!batch || batch === "item") {
            if (c === "renew") { return vault.at(...path).get(); }
            if (c === "push") { return tx(wirePush(getWirePath(path), data), ctx); }
        }

        if (!batch || batch === "end") {
            const toWire = c === "reset" ? wireReset : c === "destroy" ? wireDestroy : null;
            if (toWire) { return tx(toWire(getWirePath(path)), ctx); }
        }

    });

    return vault;

}

const vaultChGlob = (router, channel, vault, statusCfg = {}) => {
    const cleanUp = vaultChRx(router, channel, vault);
    const filter = _ => !!router.socketsCount;
    const tx = (wire, { socket }) => {
        return router.txBroad(channel, wire, socket);
    }

    return vaultChOn(vault, cleanUp, filter, tx, statusCfg);
}

const vaultChGroup = (group, channel, vault, statusCfg = {}) => {

    const getOnResetWire = vault.depth > 1
        ? _=>wireReset()
        : async (socket, groupId)=>wirePush([], await vault.at(groupId).get({ socket }));

    const cleanRx = vaultChRx(group.router, channel, vault, group.getSocketGroupId);
    const cleanReset = group.on("reset", async (socket, groupId) => {
        const wire = await getOnResetWire(socket, groupId);
        return group.router.tx(channel, [socket], wire);
    });

    const cleanUp = _ => { cleanRx(); cleanReset(); };
    const filter = path => !path.length || group.getSocketsCount(path[0]); //path[0] = groupId
    const tx = (wire, { path, socket }) => {
        if (socket) { return group.txBroad(channel, wire, socket); }
        if (path.length) { return group.tx(channel, path[0], wire); } //path[0] = groupId
        return group.router.txBroad(channel, wire);
    }
    const getWirePath = path => path.slice(1);

    return vaultChOn(vault, cleanUp, filter, tx, statusCfg, getWirePath);
}

/**
 * @preserve
 * @typedef {"none"|"reset"|"push"} BeamStatusOp
 */

/**
 * @preserve
 * @typedef {"none"|"reset"|"push"|"renew"} BeamRemoteStatusOp
 */

/**
 * @preserve
 * @typedef {"none"|"reset"|"push"|"destroy"} BeamDestroyOp
 */

/**
 * @preserve
 * Server-side Beam synchronization options.
 *
 * `push` sends a value to clients, `reset` invalidates client cache, `destroy`
 * destroys the client cell/subtree, and remote-only `renew` refreshes the
 * server Vault by calling `get()` again.
 *
 * During Vault batch events, `reset` and `destroy` are emitted once at batch
 * end. `push` and `renew` operate on batch leaf items; Bifrost does not yet
 * implement an aggregate batch push.
 *
 * @typedef {Object} ServerBeamOptions
 * @property {BeamStatusOp} [readyOp="push"] Operation used when a cell becomes ready.
 * @property {BeamRemoteStatusOp} [resetOp] Operation used for init/reset status. Defaults to `"renew"` for remote Vaults, otherwise `"push"`.
 * @property {BeamRemoteStatusOp} [expireOp="none"] Operation used when a cached cell expires.
 * @property {BeamDestroyOp} [destroyOp="destroy"] Operation used when a cell or subtree is destroyed.
 */

/**
 * @preserve
 * Connects an existing Vault to a Bifrost router or socket group.
 *
 * Prefer `createBeam(...)` unless the Vault instance is created elsewhere.
 *
 * @param {Object} bifrost Server Bifrost router or socket group.
 * @param {string} channel Beam channel name.
 * @param {import("@randajan/vault-kit").Vault} vault Vault instance.
 * @param {ServerBeamOptions} [beamOpt={}] Beam synchronization options.
 * @returns {import("@randajan/vault-kit").Vault}
 */
export const vaultChannel = (bifrost, channel, vault, beamOpt = {}) => {
    const statusCfg = formatStatusCfg(vault, beamOpt);

    if (isRouterGroup(bifrost)) {
        return vaultChGroup(bifrost, channel, vault, statusCfg);
    } else {
        return vaultChGlob(bifrost, channel, vault, statusCfg);
    }
}

/**
 * @preserve
 * Creates a server-side Beam, which is a Vault connected to a Bifrost channel.
 *
 * `vaultOpt` is passed to `@randajan/vault-kit`. Use `depth` for indexed
 * Beam cells. Grouped server beams prepend the group id as an internal Vault
 * path segment, so client paths never include the group id.
 *
 * @param {Object} bifrost Server Bifrost router or socket group.
 * @param {string} channel Beam channel name.
 * @param {Object} [vaultOpt={}] Vault options.
 * @param {number} [vaultOpt.depth=0] Number of client-visible Beam path segments.
 * @param {ServerBeamOptions} [beamOpt={}] Beam synchronization options.
 * @returns {import("@randajan/vault-kit").Vault}
 * @throws {Error} If `vaultOpt.hasMany` is used. Bifrost Beam uses `depth`.
 */
export const createBeam = (bifrost, channel, vaultOpt = {}, beamOpt = {}) => {
    const isGroup = isRouterGroup(bifrost);
    if (vaultOpt.hasMany != null) { throw new Error("Bifrost beam uses opt.depth instead of opt.hasMany"); }

    const optDepth = parseInt(vaultOpt?.depth);
    const vOpt = {
        ...vaultOpt,
        depth: (isNaN(optDepth) ? 0 : optDepth) + (isGroup ? 1 : 0)
    }

    return vaultChannel(bifrost, channel, createVault(vOpt), beamOpt);
};
