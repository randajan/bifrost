import createVault from "@randajan/vault-kit";


export const createBeam = (bifrost, channel, opt = {}) => {

    const vault = createVault({
        ...opt,
        remote: {
            pull: _ => bifrost.tx(channel, { isSet: false }),
            push: data => bifrost.tx(channel, { isSet: true, data }),
            init: set => bifrost.rx(channel, (socket, data) => set(data)),
            ...(opt.remote || {}),
        }
    });

    bifrost.on("online", (socket, status) => { vault.reset(); });

    return vault;
}