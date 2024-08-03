import React, { useEffect, useRef } from "react";
import { beam } from "./beam";
import { withBeam } from "../../../dist/client/react";

export const TestBeam = beam.with(()=>{

    const [ state, set, reply, ack ] = beam.use();

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
            <button onClick={ack}>{JSON.stringify(reply)}</button>
        </div>
    )
});