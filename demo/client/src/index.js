
import { info, log } from "@randajan/simple-lib/web";

import socketIOClient from "socket.io-client";
import ClientBridge from "../../../dist/client";

const socket = socketIOClient(`http://127.0.0.1:${info.port+1}`);

const bridge = new ClientBridge(socket);


bridge.tx("test", { msg:"msg from client" }).then(console.log);
