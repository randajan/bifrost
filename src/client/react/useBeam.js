import { useEffect, useState } from "react";

export const useBeam = (beam, initValue)=>{
    const [state, setState] = useState(initValue);

    useEffect(_=>{
        if (!beam) { return; }
        beam.get().then(setState);
        return beam.watch(setState);
    }, [beam]);

    return state;
}

