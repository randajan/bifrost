import React, { useEffect, useRef } from "react";
import { beam } from "./beam";
import useBeam from "../../../dist/esm/client/react/index.mjs";

export const TestBeam = ()=>{
    const { data, act, reply, confirm } = beam.use();

    const ref = useRef();

    const onInput = async ({target:el})=>act.write(el.value);

    useEffect(_=>{
        if (ref?.current) { ref.current.value = (data == null ? "" : data); }
    }, [ref.current, data]);

    return (
        <div className="App">
            <textarea ref={ref} onInput={onInput}/>
            <button onClick={confirm}>{JSON.stringify(reply)}</button>
        </div>
    )
};