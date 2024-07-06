import React, { useEffect, useRef } from "react";

import { bifrost } from "./testRouter";

import { useBeam } from "../../../dist/client/react";

//Test beam
const beam = bifrost.createBeam("munin", {
    remoteStateProp:"state",
    queue:{
        softMs:1000,
        maxSize:10
    }
});

export const TestBeam = ()=>{

    const [ state, set, reply ] = beam.use();

    const ref = useRef();

    const onInput = ({target:el})=>{
        set(el.value);
    }

    useEffect(_=>{
        if (ref?.current) { ref.current.value = state; }
    }, [ref.current, state]);

    return (
        <div className="App">
            <textarea ref={ref} onInput={onInput}/>
        </div>
    )
}