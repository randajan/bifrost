import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Beam } from "../../arc/class/Beam";
import { msg } from "../../arc/tools";

const _contexts = new WeakMap();

const validateBeam = (beam)=>{
    if (!(beam instanceof Beam)) { throw Error(msg(".use(beam, ...)", "beam must be instance of Beam")); }
}

const getContext = beam=>{
    validateBeam(beam);
    let ctx = _contexts.get(beam);
    if (!ctx) { _contexts.set(beam, ctx = createContext()); }
    return ctx;
}

const useBeamContext = beam=>useMemo(_=>getContext(beam), [beam]);

const useBeamActions = (beam, setReply)=>{
    return useMemo(_=>{
        validateBeam(beam);
        const setMethod = async state=>{
            const reply = await beam.set(state);
            setReply(reply);
            return reply;
        }
        return beam.applyActions(setMethod, setMethod);
    }, [beam]);
}

const useBeamState = (beam)=>{
    const [state, setState] = useState();

    useEffect(_=>{
        validateBeam(beam);
        const prom = beam.get(); //pull init
        if (beam.isDone) { prom.then(setState); }
        return beam.watch(setState);
    }, [beam]);

    return state;
}

const useBeamReplyAcknowledge = (beam, reply)=>{
    const context = useBeamContext(beam);
    const value = useContext(context);
    if (!value || value.state === beam.extractRemoteState(reply)) { return reply; }
}


export const BeamProvider = props=>{
    const { beam, children } = props;
    const context = useBeamContext(beam);
    if (useContext(context)) { return <>{children}</>; }

    const state = useBeamState(beam);

    return <context.Provider value={{state}} children={children}/>;
}

export const BeamConsumer = props=>{
    const { beam, children } = props;
    const context = useBeamContext(beam);
    return <context.Consumer children={children}/>;
}

export const useBeamGet = (beam)=>{
    const context = useBeamContext(beam);
    const value = useContext(context);
    return value ? value.state : useBeamState(beam);
}

export const useBeamSet = (beam, autoAcknowledge=true)=>{
    const [replyRaw, setReply] = useState();

    const set = useBeamActions(beam, setReply);
    const ack = _=>{ setReply(); };

    const reply = autoAcknowledge ? useBeamReplyAcknowledge(beam, replyRaw) : replyRaw;

    return [reply, set, ack];
}

export const useBeam = (beam, autoAcknowledge=true)=>{
    const state = useBeamGet(beam);
    const [reply, set, ack] = useBeamSet(beam, autoAcknowledge);
    return [state, set, reply, ack];
}

export const withBeam = (beam, Element)=>{
    return props=>(
        <BeamProvider beam={beam}>
            <Element {...props}/>
        </BeamProvider>
    );
}

//extend Beam prototype
Beam.prototype.Provider = function (props) { return <BeamProvider {...props} beam={this}/>; }
Beam.prototype.Consumer = function (props) { return <BeamConsumer {...props} beam={this}/>; }
Beam.prototype.with = function (Element) { return withBeam(this, Element); }

Beam.prototype.useGet = function () { return useBeamGet(this); }
Beam.prototype.useSet = function (autoAcknowledge=true) { return useBeamSet(this, autoAcknowledge); }
Beam.prototype.use = function (autoAcknowledge=true) { return useBeam(this, autoAcknowledge); }