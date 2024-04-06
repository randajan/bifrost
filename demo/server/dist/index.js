// <define:__slib_info>
var define_slib_info_default = { isServer: true, isBuild: false, name: "@randajan/bifrost", description: "Teleport your data from backend to frontend effortless", version: "0.0.1", author: { name: "Jan Randa", email: "jnranda@gmail.com", url: "https://www.linkedin.com/in/randajan/" }, env: "development", mode: "node", port: 3e3, dir: { root: "C:\\dev\\lib\\bifrost", dist: "demo/server/dist" } };

// node_modules/@randajan/simple-lib/dist/chunk-JLCKRPTS.js
import chalkNative from "chalk";
var chalkProps = Object.getOwnPropertyNames(Object.getPrototypeOf(chalkNative)).filter((v) => v !== "constructor");
var Logger = class extends Function {
  constructor(formater, chalkInit) {
    super();
    const chalk = chalkInit || chalkNative;
    const log2 = (...msgs) => {
      console.log(chalk(formater(msgs)));
    };
    const self = Object.setPrototypeOf(log2.bind(), new.target.prototype);
    for (const prop of chalkProps) {
      Object.defineProperty(self, prop, { get: (_) => new Logger(formater, chalk[prop]), enumerable: false });
    }
    return self;
  }
};
var logger = (...prefixes) => {
  const now = (_) => new Date().toLocaleTimeString("cs-CZ");
  prefixes = prefixes.filter((v) => !!v).join(" ");
  return new Logger((msgs) => `${prefixes} | ${now()} | ${msgs.join(" ")}`);
};

// node_modules/@randajan/simple-lib/dist/chunk-XM4YD4K6.js
var enumerable = true;
var lockObject = (o) => {
  if (typeof o !== "object") {
    return o;
  }
  const r = {};
  for (const i in o) {
    const descriptor = { enumerable };
    let val = o[i];
    if (val instanceof Array) {
      descriptor.get = (_) => [...val];
    } else {
      descriptor.value = lockObject(val);
    }
    Object.defineProperty(r, i, descriptor);
  }
  return r;
};
var info = lockObject(define_slib_info_default);

// node_modules/@randajan/simple-lib/dist/node/index.js
import { parentPort } from "worker_threads";
var log = logger(info.name, info.version, info.env);
parentPort.on("message", (msg) => {
  if (msg === "shutdown") {
    process.exit(0);
  }
});
process.on("uncaughtException", (e) => {
  console.log(e.stack);
});

// demo/server/src/index.js
import { createServer as createServerHTTP } from "http";
import { Server as IO } from "socket.io";

// dist/server/index.js
var emit = async (socket, channel, body) => {
  return new Promise((res, rej) => {
    socket.emit(channel, body, (ok, body2) => {
      if (ok) {
        res(body2);
      } else {
        rej(body2);
      }
    });
  });
};
var hear = (socket, channel, receiver) => {
  socket.on(channel, async (body, ack) => {
    try {
      await ack(true, await receiver(socket, body));
    } catch (err) {
      console.warn(err);
      await ack(false, `BE > ${err}`);
    }
  });
};
var deaf = (socket, channel) => {
  socket.off(channel);
};
var _privates = /* @__PURE__ */ new WeakMap();
var SocketGroups = class {
  constructor(bridge2, grouper) {
    const byId = /* @__PURE__ */ new Map();
    const bySocket = /* @__PURE__ */ new Map();
    const remove = (fromId, socket) => {
      const from = byId.get(fromId);
      from.delete(socket);
      if (!from.size) {
        byId.delete(fromId);
      }
      bySocket.delete(socket);
    };
    const add = (toId, socket) => {
      let to = byId.get(toId);
      if (!to) {
        byId.set(toId, to = /* @__PURE__ */ new Set());
      }
      to.add(socket);
      bySocket.set(socket, toId);
    };
    const set = (fromId, socket) => {
      const toId = grouper(socket);
      if (fromId === toId) {
        return;
      }
      remove(fromId, socket);
      add(toId, socket);
    };
    Object.defineProperty(this, "bridge", {
      value: bridge2,
      enumerable: true
    });
    bridge2.io.on("connection", (socket) => {
      add(grouper(socket), socket);
      socket.on("disconnect", (_) => {
        remove(bySocket.get(socket), socket);
      });
    });
    _privates.set(this, { byId, bySocket, remove, add, set });
  }
  reset() {
    const { bySocket, set } = _privates.get(this);
    bySocket.forEach(set);
  }
  get(id) {
    const { byId } = _privates.get(this);
    return byId.has(id) ? [...byId.get(id)] : [];
  }
  async tx(channel, transceiver, id) {
    return this.bridge.tx(channel, transceiver, this.get(id));
  }
};
var _privates2 = /* @__PURE__ */ new WeakMap();
var enumerable2 = true;
var ServerBridge = class {
  constructor(io2) {
    const _p = {
      channels: /* @__PURE__ */ new Map(),
      groups: /* @__PURE__ */ new Map(),
      sockets: /* @__PURE__ */ new Set()
    };
    Object.defineProperties(this, {
      io: { enumerable: enumerable2, value: io2 },
      sockets: { enumerable: enumerable2, get: (_) => [..._p.sockets] }
    });
    io2.on("connection", (socket) => {
      _p.sockets.add(socket);
      _p.channels.forEach((receiver, channel) => {
        hear(socket, channel, receiver);
      });
      socket.on("disconnect", (_) => {
        _p.sockets.delete(socket);
      });
    });
    _privates2.set(this, _p);
  }
  createGroup(name, grouper) {
    const { groups } = _privates2.get(this);
    if (groups.has(name)) {
      throw Error(`Bridge group '${name}' allready exist!`);
    }
    const group = new SocketGroups(this, grouper);
    groups.set(name, group);
    return group;
  }
  getGroup(name) {
    const { groups } = _privates2.get(this);
    if (!groups.has(name)) {
      throw Error(`Bridge group '${name}' doesn't exist!`);
    }
    return groups.get(name);
  }
  tx(channel, transceiver, sockets) {
    const rnbl = typeof transceiver === "function";
    if (!sockets) {
      sockets = this.sockets;
    }
    return Promise.all(sockets.map(async (socket) => {
      return rnbl ? transceiver((body) => emit(socket, channel, body), socket) : emit(socket, channel, transceiver);
    }));
  }
  rx(channel, receiver) {
    const { channels, sockets } = _privates2.get(this);
    if (channels.has(channel)) {
      throw Error(`Bridge rx channel '${channel}' allready registered!`);
    }
    channels.set(channel, receiver);
    sockets.forEach((socket) => {
      hear(socket, channel, receiver);
    });
    return (_) => {
      channels.delete(channel);
      sockets.forEach((socket) => {
        deaf(socket, channel);
      });
    };
  }
};
var server_default = ServerBridge;

// demo/server/src/index.js
var http = createServerHTTP();
http.listen(info.port + 1);
var io = new IO(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var bridge = new server_default(io);
bridge.rx("test", (socket, { msg }) => {
  console.log(msg);
  return "msg accepted";
});
//# sourceMappingURL=index.js.map
