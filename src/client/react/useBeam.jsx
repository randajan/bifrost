import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Beam } from "../../arc/beam/Beam";
import { msg } from "../../arc/tools";

const _contexts = new WeakMap();
const enumerable = true;

const validateBeam = (beam)=>{
    if (!(beam instanceof Beam)) { throw Error(msg(".use(beam, ...)", "beam must be instance of Beam")); }
}

const createBeamPort = (beam, redraw, parent)=>{
    validateBeam(beam);
    const _p = {};
    const self = {};

    const confirmReply = _=>{ delete _p.reply; redraw(); }

    if (!parent) {
        const setState = state=>{ _p.state = state; redraw(); }

        const isDone = beam.isDone;
        const raw = beam.getRaw();
        
        if (!(raw instanceof Promise)) { _p.state = raw; }
        else if (isDone) {
            _p.status = "pull";
            raw.then(state=>{ delete _p.status; setState(state); })
                .catch(error=>{ _p.status = "error"; _p.error = error; redraw(); });
        }

        Object.defineProperties(self, {
            _removeWatcher:{value:beam.watch(setState)},
            status:{enumerable, get:_=>(_p.status || beam.status)},
            isPending:{enumerable, get:_=>(_p.status === "pull" || beam.isPending)},
            isDone:{enumerable, get:_=>(_p.status !== "pull" && beam.isDone)},
            state:{enumerable, get:_=>_p.state},
        });
    } else {
        Object.defineProperties(self, {
            status:{enumerable, get:_=>parent.status},
            isPending:{enumerable, get:_=>parent.isPending},
            isDone:{enumerable, get:_=>parent.isDone},
            state:{enumerable, get:_=>parent.state},
        });
    }

    return Object.defineProperties(self, {
        reply:{enumerable, get:_=>_p.reply},
        confirm:{value:confirmReply},
        set:{get:_=>{
            if (_p.set) { return _p.set; }
            const setMethod = async (...args)=>{
                const reply = await beam.set(...args);
                _p.state = beam.extractRemoteState(reply);
                _p.reply = reply;
                redraw();
                return reply;
            }
            return _p.set = beam.applyActions(setMethod, setMethod);
        }},
    });
}

export const useBeam = (beam, expectProvider=true)=>{
    const redraw = useState()[1];

    const parent = useContext(useBeamContext(beam));
    if (!parent && expectProvider) {
        console.warn(msg(".use(beam, expectProvider=*true*)", "provider is expected. Set expectProvider to false to suppress this error"));
    }

    const port = useMemo(_=>{
        return createBeamPort(beam, _=>{ redraw(Symbol()); }, parent?.port);
    }, [beam, parent?.port]);

    useEffect(_=>port._removeWatcher, [port]);

    return port;
}

const getContext = beam=>{
    validateBeam(beam);
    let ctx = _contexts.get(beam);
    if (!ctx) { _contexts.set(beam, ctx = createContext()); }
    return ctx;
}

const useBeamContext = beam=>useMemo(_=>getContext(beam), [beam]);

export const BeamProvider = props=>{
    const { beam, children } = props;
    const context = useBeamContext(beam);
    if (useContext(context)) { return <>{children}</>; }

    const port = useBeam(beam, false);
    return <context.Provider value={{port}} children={children}/>;
}

export const BeamConsumer = props=>{
    const { beam, children } = props;
    const context = useBeamContext(beam);
    return <context.Consumer children={children}/>;
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

Beam.prototype.use = function (expectProvider=true) {
    return useBeam(this, expectProvider);
}