
export class Threads {
    constructor() {
        this.rx = new Set();
        this.tx = new Set();
    }

    async _lock(list, channel, exe, args) {
        if (list.has(channel)) { return; }
        list.add(channel);
        let res, err;
        try { res = await exe(...args); } catch(e) { err = e; }
        list.delete(channel);
        if (err) { throw err; } else { return res; }
    }

    async rxLock(channel, exe, ...args) {
        return this._lock(this.rx, channel, exe, args);
    }

    async txLock(channel, exe, ...args) {
        return this._lock(this.tx, channel, exe, args);
    }
}