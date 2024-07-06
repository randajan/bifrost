import { useEffect, useId, useState } from "react";
import { Beam } from "../../arc/class/Beam";

export const useBeamGet = (beam, stateInit)=>{
    const myid = useId();
    const [state, setState] = useState(stateInit);

    useEffect(_=>{
        if (!beam) { return; }
        beam.get(myid).then(setState);
        return beam.watch((state, srcid)=>{
            if (myid !== srcid) { setState(state); }
        });
    }, [beam, myid]);

    return state;

}

export const useBeamSet = (beam, replyInit)=>{
    const myid = useId();
    const [reply, setReply] = useState(replyInit);

    const set = async state=>{
        if (!beam) { return; }
        const reply = await beam.set(state, myid)
        setReply(reply);
        return reply;
    };

    return [reply, set];
}

export const useBeam = (beam, stateInit, replyInit)=>{
    const myid = useId();

    const [[state, reply], setStateAndReply] = useState([stateInit, replyInit]);

    const set = async state=>{
        if (!beam) { return; }
        const reply = await beam.set(state, myid);
        setStateAndReply([beam.extractRemoteState(reply), reply]);
        return reply;
    };

    useEffect(_=>{
        if (!beam) { return; }
        beam.get(myid).then(state=>setStateAndReply([state])); //pull init
        return beam.watch((state, srcid)=>{
            if (myid !== srcid) { setStateAndReply([state]); }
        });
    }, [beam, myid]);

    return [state, set, reply];
}

//extend Beam prototype
Beam.prototype.useGet = function (stateInit) { return useBeamGet(this, stateInit); }
Beam.prototype.useSet = function (replyInit) { return useBeamSet(this, replyInit); }
Beam.prototype.use = function (stateInit, replyInit) { return useBeam(this, stateInit, replyInit); }
