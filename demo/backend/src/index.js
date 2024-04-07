
import { info, log } from "@randajan/simple-lib/node";

import { createServer as createServerHTTP } from "http";
import { Server as IO } from "socket.io";

import { BifrostRouter } from "../../../dist/server";

const http = createServerHTTP();
http.listen(info.port+1);

const io = new IO(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
});

const bridge = new BifrostRouter(io);

bridge.rx("test", (socket, { msg })=>{
    console.log(msg);

    return "msg accepted";
});
