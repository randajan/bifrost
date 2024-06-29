
export const msg = (method, text, descObj={})=>{
    let desc = "";
    for (let i in descObj) { desc += (desc ? ", " : "") + ` ${i} '${descObj[i]}'`; }
    return `Bifrost${method}${desc} ${text}`;
};

export const emit = async (socket, channel, body)=>{
    return new Promise((res, rej)=>{
        socket.emit(channel, body, (ok, body)=>{
            if (ok) { res(body); } else { rej(body); }
        });
    });
}

export const hear = (socket, channel, receiver)=>{
    socket.on(channel, async (body, ack)=>{
        try { await ack(true, await receiver(socket, body)); }
        catch (err) {
            console.error(err);
            await ack(false, `Remote error: ${err}`);
        }
    });
}

export const deaf = (socket, channel)=>{ socket.off(channel); }


export const unregisterExe = (list, exe)=>{
    const x = list.indexOf(exe);
    if (x < 0) { return false; }
    list.splice(x, 1);
    return true;
}

export const registerExe = (list, exe)=>{
    list.unshift(exe);
    return _=>unregisterExe(list, exe);
}

export const mapList = async (map, list, ...args)=>{
    for (let i=list.length-1; i>=0; i--) {
        try { 
            const res = await list[i](...args);
            if (map && typeof res === "function") { map.push(res); }
        }
        catch(err) { console.warn(err); }
    }
}

export const mapSockets = (sockets, execute, except)=>{
    const result = [];
    for (const socket of sockets) {
        if (socket === except) { continue; }
        result.push(execute(socket));
    }
    return result;
}