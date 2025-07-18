
import { info } from "@randajan/simple-lib/node";

import { createServer as createServerHTTP } from "http";
import { Server as IO } from "socket.io";

import { BifrostRouter } from "../../../dist/esm/server/index.mjs";

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
const byColor = bifrost.createGroup(socket=>socket.color);


let toggle = false;

//Welcome new client
bifrost.on("hi", socket=>{
    socket.color = (["green", "blue"])[+toggle];
    byColor.resetSocket(socket);
    toggle = !toggle;

    console.log(`Hi client ${socket.id} you are ${socket.color}`);
});

bifrost.on("bye", socket=>{
    console.log(`Bye client ${socket.id}`);
});

//Register receiver
bifrost.rx("testChannel", (socket, { msg })=>{
    console.log(`Server received: '${msg}'`);

    setTimeout(async _=>{
        const msg = "TEST-BROADCAST";
        console.log(`Server send ${msg}`);

        //Send broadcast message
        bifrost.txBroad("testChannel", { msg }).then(console.log);
    }, 1000);

    //Reply to received message
    return `Server reply to: '${msg}'`;
});

//Test socket state
byColor.createBeam("color", {
    remote:{
        pull:color=>{
            return color;
        }
    }
});

//Test beam by group
byColor.createBeam("field", {
    reactions:{
        erase:_=>{
            return
        },
        write:(text, id)=>{
            return text
        }
    },
    onRequest:(text)=>[text, {isDone:true, text}]
});

let currentIndex = 0;
const testData = ["a", "b", "c", "d", "e"];

const testBeam = bifrost.createBeam("test", {
});

setInterval(_=>{
    const current = testData[currentIndex];
    currentIndex ++;
    if (currentIndex > 4) { currentIndex = 0; }
    testBeam.set(current);
}, 1000);


// setInterval(_=>{
    
//     byColor.get("green").map(socket=>{
//         socket.color = "blue";
//         //byColor.resetSocket(socket);
//         console.log(socket.color);
//     });
    
// }, 5000);