import slib, { argv } from "@randajan/simple-lib";

const { isBuild, isServer } = argv;

slib(
    isBuild,
    {
        port:3005,
        mode:isServer?"node":"web",
        minify:false,
        lib:{
            entries:[
                "client/router/index.js",
                "server/router/index.js",
                "client/index.js",
                "server/index.js",
            ]
        },
        demo:{
            dir:isServer?"demo/backend":"demo/frontend",
            external:isServer?["chalk"]:[]
        }
    }
)