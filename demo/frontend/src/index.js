
import { info } from "@randajan/simple-lib/web";

import socketIOClient from "socket.io-client";
import { BifrostRouter } from "../../../dist/client";

//Connect to Socket.io server
const socket = socketIOClient(`http://127.0.0.1:${info.port+1}`);

//Create router using Socket.io socket
const bifrost = new BifrostRouter(socket);

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
