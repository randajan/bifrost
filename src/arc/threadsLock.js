
export const createThreadsLock = ()=>{
    const threads = new Set();

    return async (key, exe, ...args)=>{
        if (threads.has(key)) { return; }
        threads.add(key);
        let res, err;
        try { res = await exe(...args); } catch(e) { err = e; }
        threads.delete(key);
        if (err) { throw err; } else { return res; }
    }
}