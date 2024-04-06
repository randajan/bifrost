
export class Threads {
    constructor() {
        this.list = new Set();
    }

    async lock(channel, exe, ...args) {
        const { list } = this;
        if (list.has(channel)) { return; }
        list.add(channel);
        let res, err;
        try { res = await exe(...args); } catch(e) { err = e; }
        list.delete(channel);
        if (err) { throw err; } else { return res; }
    }
}