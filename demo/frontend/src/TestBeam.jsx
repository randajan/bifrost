import React, { useEffect, useRef } from "react";
import { colorBeam, fieldBeam, testBeam } from "./beam";
import useBeam from "../../../dist/esm/client/react/index.mjs";

export const TestBeam = ()=>{
    const color = useBeam(colorBeam);
    const { data, act, reply, confirm } = useBeam(fieldBeam);
    const test = useBeam(testBeam);

    const ref = useRef();

    const onInput = async ({target:el})=>act.write(el.value);

    useEffect(_=>{
        if (ref?.current) { ref.current.value = (data == null ? "" : data); }
    }, [ref.current, data]);

    return (
        <div className="App" style={{backgroundColor:color?.data}}>
            <div style={{color:"white"}}>{test?.data}</div>
            <textarea ref={ref} onInput={onInput}/>
            <button onClick={confirm}>{JSON.stringify(reply)}</button>
        </div>
    )
};