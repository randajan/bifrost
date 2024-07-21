import React, { useEffect, useRef } from "react";

import { bifrost } from "./testRouter";

import { useBeam } from "../../../dist/client/react";

//Test beam
const beam = window.beam = bifrost.createBeam("munin", {
    remoteStateProp:"text",
    queue:{
        softMs:1000,
        maxSize:10
    },
    actions:["write", "erase"]
});

export const TestBeam = ()=>{

    const [ state, set, reply ] = beam.use();

    const ref = useRef();

    const onInput = ({target:el})=>{
        set.write(el.value);
    }

    useEffect(_=>{
        if (ref?.current) { ref.current.value = (state == null ? "" : state); }
    }, [ref.current, state]);

    return (
        <div className="App">
            <textarea ref={ref} onInput={onInput}/>
        </div>
    )
}