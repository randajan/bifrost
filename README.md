# @randajan/bifrost

[![NPM](https://img.shields.io/npm/v/@randajan/bifrost.svg)](https://www.npmjs.com/package/@randajan/bifrost) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Bifrost is a small Socket.IO communication layer for JavaScript applications.

It provides two public layers:

- **Router**: request/response channels between a Socket.IO client and server.
- **Beam**: state synchronization powered by [`@randajan/vault-kit`](https://www.npmjs.com/package/@randajan/vault-kit).

Use the router for explicit calls and broadcasts. Use Beam when both sides should work with cached state, remote pull/push, actions, TTL, and passive updates through the Vault API.

## Install

```bash
npm install @randajan/bifrost @randajan/vault-kit
```

or

```bash
yarn add @randajan/bifrost @randajan/vault-kit
```

Bifrost uses your existing Socket.IO server/client instances, so install `socket.io` and `socket.io-client` in the application that owns them.

## Public Imports

```javascript
import BifrostRouter, { BifrostRouter as ClientRouter } from "@randajan/bifrost/client";
import { createBeam as createClientBeam } from "@randajan/bifrost/client/beam";
import useBeam from "@randajan/bifrost/client/react";

import ServerRouter, { BifrostRouter as ServerBifrostRouter } from "@randajan/bifrost/server";
import { createBeam as createServerBeam } from "@randajan/bifrost/server/beam";
```

The default export and named `BifrostRouter` export are the same router class for each side.

## Router

### Basic Request/Response

Server:

```javascript
import { createServer } from "http";
import { Server } from "socket.io";
import { BifrostRouter } from "@randajan/bifrost/server";

const http = createServer();
const io = new Server(http);
const bifrost = new BifrostRouter(io);

bifrost.rx("profile:get", async (socket, { userId }) => {
    return { id:userId, name:"Ada" };
});

http.listen(3000);
```

Client:

```javascript
import { io } from "socket.io-client";
import { BifrostRouter } from "@randajan/bifrost/client";

const socket = io("http://localhost:3000");
const bifrost = new BifrostRouter(socket);

const profile = await bifrost.tx("profile:get", { userId:"ada" });
console.log(profile);
```

### Server Broadcast

```javascript
bifrost.txBroad("notice", { text:"Server state changed" });
```

```javascript
bifrost.rx("notice", (socket, notice) => {
    console.log(notice.text);
});
```

### Client Router API

```javascript
const bifrost = new BifrostRouter(socket, onError, exposeCause);
```

| API | Description |
|-|-|
| `status` | Current Socket.IO connection state: `"online"`, `"offline"`, or `"pending"`. |
| `tx(channel, body)` | Sends `body` to the remote receiver and resolves with its reply. |
| `tx(channel, transceiver)` | Runs `transceiver(send)` for advanced multi-step sends. |
| `rx(channel, receiver)` | Registers `receiver(socket, body)` and returns an unregister function. One receiver can own a channel at a time. |
| `on(event, execute)` | Listens for router status events. Client events are `"online"`, `"offline"`, and `"pending"`. |

### Server Router API

```javascript
const bifrost = new BifrostRouter(io, onError, exposeCause);
```

| API | Description |
|-|-|
| `sockets` | Array of currently connected Socket.IO sockets. |
| `socketsCount` | Number of currently connected sockets. |
| `tx(channel, sockets, body, excludeSocket)` | Sends `body` to the provided sockets and resolves with all replies. |
| `tx(channel, sockets, transceiver, excludeSocket)` | Runs `transceiver(send, socket)` for every target socket. |
| `txBroad(channel, bodyOrTransceiver, excludeSocket)` | Sends to all connected sockets, optionally excluding one socket. |
| `rx(channel, receiver)` | Registers `receiver(socket, body)` and returns an unregister function. |
| `on(event, execute)` | Listens for server socket events. Server events are `"hi"` and `"bye"`. |
| `createGroup(getSocketGroupId)` | Creates a `SocketsGroup` that maps sockets to group ids. |

### Remote Errors

When a receiver throws, the caller receives:

```javascript
Error(`Remote error '${channel}'`)
```

By default, Bifrost does not expose the original remote error. This is the safe production behavior because messages and stack traces can leak implementation details.

Pass `exposeCause:true` on the router that owns the throwing receiver only when the caller is allowed to inspect the original error:

```javascript
const bifrost = new BifrostRouter(io, onError, true);
```

With `exposeCause` enabled, the rejected error contains the serialized original error in `error.cause`.

## Socket Groups

Socket groups are server-side only. They let the server decide which sockets belong together and then target communication to that group.

```javascript
const byUser = bifrost.createGroup(socket => socket.data.userId);

byUser.rx("profile:update", async (socket, userId, patch) => {
    return saveProfile(userId, patch);
});

await byUser.tx("profile:changed", "ada", { ok:true });
```

| API | Description |
|-|-|
| `tx(channel, groupId, bodyOrTransceiver, exceptSocket)` | Sends to sockets currently assigned to `groupId`. |
| `txBroad(channel, bodyOrTransceiver, socket, excludeSocket=true)` | Resolves `groupId` from `socket` and broadcasts to that socket's group. |
| `rx(channel, receiver)` | Registers `receiver(socket, groupId, body)` for grouped traffic. |
| `get(groupId)` | Returns sockets currently assigned to `groupId`. |
| `resetAll()` | Re-evaluates the group id for every known socket. |
| `reset(groupId)` | Re-evaluates sockets currently assigned to `groupId`. |
| `resetSocket(socket)` | Re-evaluates one socket. |
| `resetSockets(sockets)` | Re-evaluates the provided sockets. |
| `on(event, execute)` | Listens for `"hi"`, `"bye"`, and `"reset"` group events. |

Group event callbacks receive:

```javascript
byUser.on("hi", (socket, groupId) => {});
byUser.on("bye", (socket, groupId) => {});
byUser.on("reset", (socket, toId, fromId) => {});
```

## Beam

Beam connects a client Vault to a server Vault over a Bifrost channel. The returned object is a Vault instance from `@randajan/vault-kit`, so Vault options and methods such as `get`, `set`, `act`, `reset`, `destroy`, `on`, `forEach`, `ttl`, `actions`, and `unfold` keep their Vault behavior.

Use `createBeam` from the dedicated beam entrypoints. The legacy router method exists only as a migration error.

### Basic Beam

Server:

```javascript
import { createBeam } from "@randajan/bifrost/server/beam";

createBeam(bifrost, "profile", {
    remote:{
        pull:({ socket }) => loadProfile(socket.data.userId),
        push:({ data, socket }) => saveProfile(socket.data.userId, data)
    }
});
```

Client:

```javascript
import { createBeam } from "@randajan/bifrost/client/beam";

const profileBeam = createBeam(bifrost, "profile");

const profile = await profileBeam.get();
await profileBeam.set({ ...profile, theme:"dark" });
```

### React Beam

`@randajan/bifrost/client/react` re-exports the Vault React hook as `useBeam`.

```javascript
import useBeam from "@randajan/bifrost/client/react";

function ProfileForm({ profileBeam }) {
    const profile = useBeam(profileBeam);

    return (
        <button disabled={profile.isStatus(["pull", "push"])} onClick={() => profile.set({ name:"Ada" })}>
            Save
        </button>
    );
}
```

### Beam Sync Operations

Server beams accept an optional fourth argument for passive synchronization behavior:

```javascript
createBeam(bifrost, "profile", vaultOpt, {
    readyOp:"push",
    resetOp:"renew",
    expireOp:"none",
    destroyOp:"destroy"
});
```

| Option | Default | Allowed ops | Description |
|-|-|-|-|
| `readyOp` | `"push"` | `"none"`, `"reset"`, `"push"` | Runs when a cell becomes ready. |
| `resetOp` | `"renew"` for remote Vaults, otherwise `"push"` | `"none"`, `"reset"`, `"push"`, remote-only `"renew"` | Runs when a cell is reset to `init`. |
| `expireOp` | `"none"` | `"none"`, `"reset"`, `"push"`, remote-only `"renew"` | Runs when a cached cell expires. |
| `destroyOp` | `"destroy"` | `"none"`, `"reset"`, `"push"`, `"destroy"` | Runs when a cell or subtree is destroyed. |

Operations:

- `"push"` sends the current value to clients.
- `"reset"` invalidates client cache; active hooks pull again if they still need the value.
- `"destroy"` destroys the matching client cell or subtree.
- `"renew"` is server-side only and available only for remote Vaults. It calls `get()` again; any resulting `ready` event then follows `readyOp`.

Batch behavior: Bifrost is batch-aware for subtree/root reset and destroy. `reset` and `destroy` are emitted once at the end of a Vault batch. `readyOp:"push"` does not send a real aggregate batch push yet; during batch events it sends leaf item pushes. Aggregate batch push is intentionally deferred.

### Indexed Beam

Use `depth` to create multiple cached cells on the same Beam channel. Address cells with Vault paths.

Server:

```javascript
createBeam(bifrost, "space", {
    depth:1,
    remote:{
        pull:({ path:[spaceId], socket }) => loadSpace(socket.data.userId, spaceId),
        push:({ path:[spaceId], data, socket }) => saveSpace(socket.data.userId, spaceId, data)
    }
});
```

Client:

```javascript
const spaceBeam = createBeam(bifrost, "space", { depth:1 });

await spaceBeam.at("profile").get();
await spaceBeam.at("profile").set({ text:"Hello" });
await spaceBeam.at("settings").set({ compact:true });
```

With React, pass the path array after the beam:

```javascript
const profile = useBeam(spaceBeam, ["profile"]);
const settings = useBeam(spaceBeam, ["settings"]);
```

### Grouped Beam

Grouped beams use a `SocketsGroup` as the transport target. The group id is prepended as an internal server Vault path segment.

```javascript
const byUser = bifrost.createGroup(socket => socket.data.userId);

createBeam(byUser, "profile", {
    remote:{
        pull:({ path:[userId] }) => loadProfile(userId),
        push:({ path:[userId], data }) => saveProfile(userId, data)
    }
});
```

Client paths do not include the group id. For a grouped Beam created with `depth:1`, the server Vault path is `[groupId, itemId]`, while the client path is `[itemId]`.

When a socket changes group, grouped Beam sends a root reset wire to that socket. The client invalidates its local cache and active hooks pull only the values they still need.

## Beam Wire Compatibility

Current Beam communication uses internal Bifrost Wire messages with version validation. Wire modes are `"pull"`, `"push"`, `"reset"`, and `"destroy"`. Path shape is delegated to Vault Kit.

Current Beam is not compatible with older Bifrost Beam implementations that did not send the Wire object. Deploy matching client and server versions together when using Beam. Wire is internal to Bifrost and should not be used directly by application code.

## Development

```bash
npm run dev:server
npm run dev:client
npm run build
```

The demo lives in `/demo` and exercises router calls, broadcasts, grouped beams, and indexed beams.

## License

MIT (c) [randajan](https://github.com/randajan)
