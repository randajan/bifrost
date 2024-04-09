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
            console.warn(err);
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
    list.push(exe);
    return _=>unregisterExe(list, exe);
}

export const mapList = async (map, list, ...args)=>{
    for (let i=list.length-1; i>=0; i--) {
        const res = await list[i](...args);
        if (map && typeof res === "function") { map.push(res); }
    }
}