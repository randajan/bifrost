import { info } from "@randajan/simple-lib/web";

import socketIOClient from "socket.io-client";
import { BifrostRouter } from "../../../dist/esm/client/index.mjs";

//Connect to Socket.io server
const socket = socketIOClient(`localhost:${info.port+1}`);

//Create router using Socket.io socket
export const bifrost = new BifrostRouter(socket);

const msg = "TEST-MSG";
console.log(`Client send: ${msg}`);

//Send message to server
bifrost.tx("testChannel", { msg }).then(console.log);

//Register receiver
bifrost.rx("testChannel", (socket, { msg })=>{
    console.log(`Client received: '${msg}'`);

    //Reply to received message
    return `Client reply to: '${msg}'`;
});

//Test socket state
bifrost.tx("color", async (tx)=>{
    const color = await tx();
    document.getElementsByTagName("body")[0].style["background-color"] = color;
});

bifrost.rx("stuckTest", _=>{
    throw Error("What a nice error");
});