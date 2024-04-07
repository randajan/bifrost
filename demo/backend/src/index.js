
import { info } from "@randajan/simple-lib/node";

import { createServer as createServerHTTP } from "http";
import { Server as IO } from "socket.io";

import { BifrostRouter } from "../../../dist/server";

//Create simple server
const http = createServerHTTP();
http.listen(info.port+1);

//Register Socket.io API
const io = new IO(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
});

//Create router using Socket.io API
const bifrost = new BifrostRouter(io);

//Register receiver
bifrost.rx("testChannel", (socket, { msg })=>{
    console.log(`Server received: '${msg}'`);

    setTimeout(async _=>{
        const msg = "TEST-BROADCAST";
        console.log(`Server send ${msg}`);

        //Send broadcast message
        bifrost.tx("testChannel", { msg }).then(console.log);
    }, 1000);

    //Reply to received message
    return `Server reply to: '${msg}'`;
});
