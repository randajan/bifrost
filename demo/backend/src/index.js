
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

let toggle = false;

//Welcome new client
bifrost.welcome(socket=>{
    socket.color = (["green", "blue"])[+toggle];
    toggle = !toggle;

    console.log(`Welcome client ${socket.id} you are ${socket.color}`);

    //Optionaly set up cleanUp function that will be triggered when socket disconnected
    return _=>{ console.log(`Farewell client ${socket.id}`); }
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
bifrost.rx("color", (socket)=>{
    return socket.color;
});

const byColor = bifrost.createGroup("byColor", "color");

//Test beam by group
const textByColor = {};

const beam = byColor.createBeam("munin", {
    get:(color)=>textByColor[color],
    set:(text, color)=>{
        textByColor[color] = text;
        return {isDone:true, text}
    },
    localStateProp:"text",
    reactions:{
        erase:_=>{
            
        },
        write:text=>{
            console.log(text);
            return text;
        }
    }
});

setInterval(_=>{
    
    byColor.get("green").map(socket=>{
        socket.color = "blue";
        //byColor.resetSocket(socket);
        console.log(socket.color);
    });
    
}, 5000);



bifrost.createBeam("test");