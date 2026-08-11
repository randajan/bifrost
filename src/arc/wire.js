const _version = "2";
const _modes = ["pull", "push", "reset", "destroy"];

const valid = (pass, msg)=>{ if (!pass) { throw new Error(`Bifrost beam wire ${msg}`); } }

const createWire = (mode, path, data)=>{
    const wire = { version:_version, mode };
    if (path?.length) { wire.path = path; }
    if (mode === "push") { wire.data = data; }
    return Object.freeze(wire);
}


export const wirePush = (path, data)=>createWire("push", path, data);
export const wirePull = (path)=>createWire("pull", path);
export const wireReset = (path)=>createWire("reset", path);
export const wireDestroy = (path)=>createWire("destroy", path);

export const validateWire = (wire, modes=_modes)=>{

    valid(wire && typeof wire === "object" && !Array.isArray(wire), "must be an object");

    const { version, mode, data } = wire;
    const path = wire.path == null ? [] : wire.path;

    valid(version === _version, `version mismatch. Expected '${_version}', received '${version}'`);
    valid(Array.isArray(path), "path must be an Array");

    valid(modes.includes(mode), `mode must be one of '${modes.join(",")}'. Received '${mode}'`);

    return Object.freeze({ mode, data, path });
}
