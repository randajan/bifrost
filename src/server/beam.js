import createVault from "@randajan/vault-kit";
import { pushWire, validateWire } from "../arc/wire.js";

const _txStatuses = ["init", "ready", "expired"];

const isRouterGroup = bifrost=>{
    const { getSocketGroupId, getSocketsCount } = bifrost;
    return !!(getSocketGroupId && getSocketsCount);
}

const vaultChannelOne = (bifrost, channel, vault) => {
    const { hasMany, hasRemote } = vault;

    const cleanUp = bifrost.rx(channel, async (socket, wire) => {
        const { isSet, data, id } = validateWire(wire, hasMany);
        const args = hasMany ? [ id, socket ] : [socket];
        return isSet ? vault.set(data, ...args) : vault.get(...args);
    });

    vault.on(async ({ status, data }, ...args) => {
        const id = hasMany ? args[0] : null;
        const socket = hasMany ? args[1] : args[0];
        if (status === "destroyed") { cleanUp(); }
        if (!_txStatuses.includes(status)) { return; }
        if (!bifrost.socketsCount) { return; }
        if (status !== "ready" && hasRemote) { return vault.get(...args); }
        bifrost.txBroad(channel, pushWire(data, hasMany, id), socket);
    });

    return vault;
}

const vaultChannelMany = (bifrost, channel, vault) => {

    const cleanRx = bifrost.router.rx(channel, async (socket, wire) => {
        const { isSet, data } = validateWire(wire, false);
        const groupId = await bifrost.getSocketGroupId(socket);
        if (!isSet) { return vault.get(groupId, socket); }
        return vault.set(data, groupId, socket);
    });

    const cleanReset = bifrost.on("reset", async (socket, groupId) => {
        bifrost.router.tx(channel, [socket], pushWire(await vault.get(groupId, socket)));
    });

    vault.on(async ({ status, data }, groupId, sourceSocket) => {
        if (status === "destroyed") { cleanRx(); cleanReset(); }
        if (!_txStatuses.includes(status)) { return; }
        if (!bifrost.getSocketsCount(groupId)) { return; }
        if (status !== "ready" && vault.hasRemote) { return vault.get(groupId, sourceSocket); }
        if (!sourceSocket) { return bifrost.tx(channel, groupId, pushWire(data)); }
        else { return bifrost.txBroad(channel, pushWire(data), sourceSocket); }
    });

    return vault;
}

/**
 * @preserve
 * Connects an existing Vault to a Bifrost router or socket group.
 *
 * Prefer `createBeam(...)` unless the Vault instance is created elsewhere.
 *
 * @param {Object} bifrost Server Bifrost router or socket group.
 * @param {string} channel Beam channel name.
 * @param {import("@randajan/vault-kit").Vault} vault Vault instance.
 * @returns {import("@randajan/vault-kit").Vault}
 */
export const vaultChannel = (bifrost, channel, vault)=>{
    return isRouterGroup(bifrost) ? vaultChannelMany(bifrost, channel, vault) : vaultChannelOne(bifrost, channel, vault);
}

/**
 * @preserve
 * Creates a server-side Beam, which is a Vault connected to a Bifrost channel.
 *
 * Options are passed to `@randajan/vault-kit`. `hasMany:true` is supported on a
 * normal server router. It is rejected for grouped beams because the group id is
 * already used as the internal Vault index.
 *
 * @param {Object} bifrost Server Bifrost router or socket group.
 * @param {string} channel Beam channel name.
 * @param {Object} [opt={}] Vault options.
 * @param {boolean} [opt.hasMany=false] Enables indexed Beam cells on non-group beams.
 * @returns {import("@randajan/vault-kit").Vault}
 * @throws {Error} If `hasMany:true` is used with a socket group.
 */
export const createBeam = (bifrost, channel, opt = {}) =>{
    const isGroup = isRouterGroup(bifrost);
    if (isGroup && opt.hasMany === true) { throw new Error("Bifrost grouped beam does not support opt.hasMany"); }

    return vaultChannel(bifrost, channel, createVault({
        ...opt,
        hasMany:opt.hasMany || isGroup
    }));
};
