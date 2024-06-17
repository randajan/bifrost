
export const createThreadsLock = ()=>{
    const threads = new Set();

    return async (lock, exe, ...args)=>{
        if (threads.has(lock)) { return; }
        threads.add(lock);
        let res, err;
        try { res = await exe(...args); } catch(e) { err = e; }
        threads.delete(lock);
        if (err) { throw err; } else { return res; }
    }
}