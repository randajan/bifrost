import slib, { argv } from "@randajan/simple-lib";

const { isBuild, isServer } = argv;

slib(
    isBuild,
    {
        port: 3005,
        mode: isServer ? "node" : "web",
        rebuildBuffer: isServer ? 500 : 100,
        minify: false,
        loader: {
            ".js": "jsx"
        },
        lib: {

            entries: [
                "server/index.js",
                "server/beam.js",
                "client/index.js",
                "client/beam.js",
                "client/react/index.js"
            ]
        },
        demo: {
            dir: isServer ? "demo/backend" : "demo/frontend",
        }
    }
)