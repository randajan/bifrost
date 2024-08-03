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

const useBeamState = (beam, stateInit)=>{
    const [state, setState] = useState(stateInit);

    useEffect(_=>{
        validateBeam(beam);
        const prom = beam.get(); //pull init
        if (beam.isDone) { prom.then(setState); }
        return beam.watch(setState);
    }, [beam]);

    return state;
}


export const BeamProvider = props=>{
    const { beam, children, stateInit } = props;
    const context = useBeamContext(beam);
    if (useContext(context)) { return <>{children}</>; }

    const state = useBeamState(beam, stateInit);

    return <context.Provider value={{state}} children={children}/>;
}

export const BeamConsumer = props=>{
    const { beam, children } = props;
    const context = useBeamContext(beam);
    return <context.Consumer children={children}/>;
}

export const useBeamGet = (beam, stateInit)=>{
    const context = useBeamContext(beam);
    const value = useContext(context);
    if (!value) { throw Error(msg(".use(beam, ...)", "require beam.Provider")); }
    return value.state;
}

export const useBeamSet = (beam, replyInit)=>{
    const context = useBeamContext(beam);
    if (!useContext(context)) { throw Error(msg(".use(beam, ...)", "require beam.Provider")); }

    const [{current}, setCurrent] = useState({current:{reply:replyInit}});

    const set = useBeamActions(beam, reply=>current.reply = reply);
    const ack = _=>{ delete current.reply; setCurrent({current}); };

    return [current.reply, set, ack];
}

export const useBeam = (beam, stateInit, replyInit)=>{
    const state = useBeamGet(beam, stateInit);
    const [reply, set, ack] = useBeamSet(beam, replyInit);
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

Beam.prototype.use = function (stateInit, replyInit) { return useBeam(this, stateInit, replyInit); }
Beam.prototype.useSet = function (replyInit) { return useBeamSet(this, replyInit); }
Beam.prototype.useGet = function (stateInit) { return useBeamGet(this, stateInit); }