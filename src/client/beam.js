import createVault from "@randajan/vault-kit";
import { wirePull, wirePush, validateWire } from "../arc/wire.js";

/**
 * @preserve
 * Creates a client-side Beam, which is a Vault connected to a Bifrost channel.
 *
 * Options are passed to `@randajan/vault-kit`. Use `depth` for indexed Beam
 * cells and address them with Vault path arrays through `vault.at(...path)` or
 * the React hook path argument.
 *
 * Client `get()` sends a `"pull"` wire message. Client `set()` and `act.*()`
 * send `"push"` wire messages. The server may send `"push"`, `"reset"`, or
 * `"destroy"` messages back to update, invalidate, or destroy local cache.
 *
 * @param {Object} bifrost Client Bifrost router.
 * @param {string} channel Beam channel name.
 * @param {Object} [opt={}] Vault options.
 * @param {number} [opt.depth=0] Number of required Beam path segments.
 * @returns {import("@randajan/vault-kit").Vault}
 */
export const createBeam = (bifrost, channel, opt = {}) => {

    const vault = createVault({
        ...opt,
        remote: {
            init: setVault => bifrost.rx(channel, (socket, wire)=>{
                const { mode, data, path } = validateWire(wire, ["push", "reset", "destroy"]);
                if (mode === "push") { setVault(data, path, { socket }); }
                else if (mode === "reset") { vault.at(...path).reset({ socket }); }
                else if (mode === "destroy") { vault.at(...path).destroy({ socket }); }
            }),
            destroy:({ path, batch }, cleanUp)=>{
                if (!path.length && (!batch || batch === "start")) { cleanUp(); } 
            },
            pull: ({ path })=> bifrost.tx(channel, wirePull(path)),
            push: ({ path, data }) => bifrost.tx(channel, wirePush(path, data)),
            ...(opt.remote || {}),
        }
    });
    
    bifrost.on("online", socket => vault.reset({ socket }));

    return vault;
}
