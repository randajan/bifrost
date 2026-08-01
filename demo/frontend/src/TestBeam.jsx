import React, { useEffect, useRef } from "react";
import { colorBeam, fieldBeam, spaceBeam, testBeam } from "./beam";
import useBeam from "../../../dist/esm/client/react/index.mjs";

const SpaceField = ({ id, label })=>{
    const { data, act, reply, confirm } = useBeam(spaceBeam, id);
    const ref = useRef();

    const onInput = async ({target:el})=>act.write(el.value);

    useEffect(_=>{
        if (ref?.current) { ref.current.value = (data == null ? "" : data); }
    }, [ref.current, data]);

    return (
        <label className="SpaceField">
            <span>{label}</span>
            <textarea ref={ref} onInput={onInput}/>
            <button onClick={confirm}>{JSON.stringify(reply)}</button>
        </label>
    );
};

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
            <div className="SpaceGrid">
                <SpaceField id="profile" label="profile"/>
                <SpaceField id="settings" label="settings"/>
            </div>
        </div>
    )
};
