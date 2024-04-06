import slib, { argv } from "@randajan/simple-lib";

const { isBuild, isServer } = argv;

slib(
    isBuild,
    {
        mode:isServer?"node":"web",
        minify:false,
        lib:{
            entries:["client/index.js", "server/index.js"]
        },
        demo:{
            dir:isServer?"demo/server":"demo/client",
            external:isServer?["chalk"]:[]
        }
    }
)