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