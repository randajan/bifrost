# @randajan/bifrost

[![NPM](https://img.shields.io/npm/v/@randajan/bifrost.svg)](https://www.npmjs.com/package/@randajan/bifrost) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Bifrost is a versatile library for seamless data communication between backend and frontend applications via Socket.IO integration. Key features include:

- Asynchronous function handling for efficient operation.
- Automatic response processing for streamlined development.
- Automatic thread lock setting for simplified state synchronization.
- Easy management of client connection groups for WebSocket connections.

Say goodbye to cumbersome data transfer mechanisms and embrace the simplicity and efficiency of Bifrost for effortless data teleportation.

## Install

```bash
npm install @randajan/bifrost
```

or

```bash
yarn add @randajan/bifrost
```


## Client application

### Client example

```javascript
import socketIOClient from "socket.io-client";
import { BifrostRouter } from "@randajan/bifrost/client";

// Connect to Socket.io server
const socket = socketIOClient(`https://example.com`);

// Create router using Socket.io socket
const bifrost = new BifrostRouter(socket);

const msg = "TEST-MSG";
console.log(`Client send: ${msg}`);

// Send message to server
bifrost.tx("testChannel", { msg }).then(console.log);

// Register receiver
bifrost.rx("testChannel", (socket, { msg }) => {
    console.log(`Client received: '${msg}'`);

    // Reply to received message
    return `Client reply to: '${msg}'`;
});
```

### Client Router API

| Function | Description | Parameters | Return Value |
|-|-|-|-|
| `tx` | Sends data on the specified channel and processes responses using the provided function. | `channel` - Name of the channel to send data on.<br>`transceiver` - Object or Function for sending data on the channel.<br>*Note:* If `transceiver` is a function, it accepts a async callback parameter for sending data on the channel. | `Promise` - Asynchronous operation that resolves with the result of the data transfer. |
| `rx` | Registers a receiver function for handling data received on the specified channel. | `channel` - Name of the channel to receive data on.<br>`receiver` - Function for processing received data.<br>*Note:* If `receiver` is a function, it accepts the received data as a parameter. | `Function` - Function for unregistering the receiver from the specified channel. |
| `txLock` | Locks the transmission on the outbound channel (tx) for data transfer for the duration of the transaction execution. | `channel` - Name of the channel to perform the transaction on.<br>`execute` - Function to execute the transaction.<br>`args` - Optional arguments for the `execute` function. | `Promise` - Asynchronous operation that resolves with the result of the transaction. |
| `rxLock` | Locks the reception on the inbound channel (rx) for data transfer for the duration of the transaction execution. | `channel` - Name of the channel to perform the transaction on.<br>`execute` - Function to execute the transaction.<br>`args` - Optional arguments for the `execute` function. | `Promise` - Asynchronous operation that resolves with the result of the transaction. |

## Server application

### Server example

```javascript
import { createServer as createServerHTTP } from "http";
import { Server as IO } from "socket.io";

import { ServerRouter } from "bifrost";

// Create simple HTTP server
const http = createServerHTTP();
http.listen(80);

// Register Socket.IO API with CORS enabled
const io = new IO(http);

// Create router using Socket.IO API
const bifrost = new ServerRouter(io);

// Register receiver for "testChannel"
bifrost.rx("testChannel", (socket, { msg }) => {
    console.log(`Server received: '${msg}'`);

    setTimeout(async _ => {
        const msg = "TEST-BROADCAST";
        console.log(`Server send ${msg}`);

        // Send broadcast message
        bifrost.tx("testChannel", { msg }).then(console.log);
    }, 1000);

    // Reply to received message
    return `Server reply to: '${msg}'`;
});
```

### Server Router API
| Function | Description | Parameters | Return Value |
|-|-|-|-|
| `tx` | Sends data on the specified channel to the provided sockets using the transceiver function and processes responses using the provided function. | `channel` - Name of the channel to send data on.<br>`transceiver` - Object or Function for sending data on the channel.<br>*Note:* If `transceiver` is a function, it accepts a async callback parameter for sending data on the channel.<br>`sockets` - Optional array of sockets to send data to. | `Promise` - Asynchronous operation that resolves with the result of the data transfer. |
| `rx` | Registers a receiver function for handling data received on the specified channel from all connected sockets. | `channel` - Name of the channel to register the receiver for.<br>`receiver` - Function for processing received data. | `Function` - Function for unregistering the receiver from the specified channel. |
| `createGroup` | Creates a new group for managing sockets with the specified name and grouper function. | `name` - Name of the group to create.<br>`grouper` - Function that takes a socket object as input parameter and returns an its ID value that is used for creating a group. | `SocketsGroup` - Instance of the created group. |
| `getGroup` | Retrieves the group with the specified name. | `name` - Name of the group to retrieve. | `SocketsGroup` - Instance of the requested group. |


### Server Sockets Groups API

| Function | Description | Parameters | Return Value |
|-|-|-|-|
| `reset` | Resets the socket group by reassigning sockets to their corresponding groups based on the grouper function. | - | - |
| `get` | Retrieves an array of sockets associated with the specified group ID. | `id` - ID of the group to retrieve sockets for. | Array of sockets associated with the specified group ID. |
| `tx` | Sends data on the specified channel to the sockets associated with the specified group ID using the transceiver function. | `channel` - Name of the channel to send data on.<br>`transceiver` - Function or code for sending data on the channel.<br>`id` - ID of the group to send data to. | `Promise` - Asynchronous operation that resolves when all data has been sent. |

## License

MIT © [randajan](https://github.com/randajan)
