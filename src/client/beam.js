import createVault from "@randajan/vault-kit";
import { pullWire, pushWire, validateWire } from "../arc/wire.js";


/**
 * @preserve
 * Creates a client-side Beam, which is a Vault connected to a Bifrost channel.
 *
 * Options are passed to `@randajan/vault-kit`. When `hasMany:true` is used, the
 * first extra Vault argument is sent as the Beam cell id.
 *
 * @param {Object} bifrost Client Bifrost router.
 * @param {string} channel Beam channel name.
 * @param {Object} [opt={}] Vault options.
 * @param {boolean} [opt.hasMany=false] Enables indexed Beam cells.
 * @returns {import("@randajan/vault-kit").Vault}
 */
export const createBeam = (bifrost, channel, opt = {}) => {

    let hasMany = opt.hasMany === true;

    const rx = wire =>{
        const { data, id } = validateWire(wire, hasMany, true);
        return hasMany ? [data, id] : [data];
    }

    const vault = createVault({
        ...opt,
        remote: {
            pull: id => bifrost.tx(channel, pullWire(hasMany, id)),
            push: (data, id) => bifrost.tx(channel, pushWire(data, hasMany, id)),
            init: set => bifrost.rx(channel, (socket, wire)=>set(...rx(wire))),
            ...(opt.remote || {}),
        }
    });
    
    bifrost.on("online", (socket, status) => { vault.resetAll(); });

    return vault;
}
