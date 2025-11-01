import createVault from "@randajan/vault-kit";

const _txStatuses = ["init", "ready", "expired"];

const isRouterGroup = bifrost=>{
    const { getSocketGroupId, getSocketsCount } = bifrost;
    return !!(getSocketGroupId && getSocketsCount);
}

const vaultChannelOne = (bifrost, channel, vault) => {
    const cleanUp = bifrost.rx(channel, async (socket, { isSet, data }) => isSet ? vault.set(data, socket) : vault.get(socket));

    vault.on(async ({ status, data }, sourceSocket) => {
        if (status === "detroyed") { cleanUp(); }
        if (!_txStatuses.includes(status)) { return; }
        if (!bifrost.socketsCount) { return; }
        if (status !== "ready" && vault.hasRemote) { return vault.get(sourceSocket); }
        bifrost.txBroad(channel, data, sourceSocket);
    });

    return vault;
}

const vaultChannelMany = (bifrost, channel, vault) => {

    const cleanRx = bifrost.router.rx(channel, async (socket, { isSet, data }) => {
        const groupId = await bifrost.getSocketGroupId(socket);
        if (!isSet) { return vault.get(groupId, socket); }
        return vault.set(data, groupId, socket);
    });

    const cleanReset = bifrost.on("reset", async (socket, groupId) => {
        bifrost.router.tx(channel, [socket], await vault.get(groupId, socket));
    });

    vault.on(async ({ status, data }, groupId, sourceSocket) => {
        if (status === "detroyed") { cleanRx(); cleanReset(); }
        if (!_txStatuses.includes(status)) { return; }
        if (!bifrost.getSocketsCount(groupId)) { return; }
        if (status !== "ready" && vault.hasRemote) { return vault.get(groupId, sourceSocket); }
        if (!sourceSocket) { return bifrost.tx(channel, groupId, data); }
        else { return bifrost.txBroad(channel, data, sourceSocket); }
    });

    return vault;
}

export const vaultChannel = (bifrost, channel, vault)=>{
    return isRouterGroup(bifrost) ? vaultChannelMany(bifrost, channel, vault) : vaultChannelOne(bifrost, channel, vault);
}

export const createBeam = (bifrost, channel, opt = {}) =>{
    return vaultChannel(bifrost, channel, createVault({
        ...opt,
        hasMany:isRouterGroup(bifrost)
    }));
};