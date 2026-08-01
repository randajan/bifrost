const _version = "1";
const valid = (pass, msg)=>{ if (!pass) { throw new Error(`Bifrost beam wire ${msg}`); } }

const createWire = (isSet, data, hasMany, id)=>{
    hasMany = hasMany === true;
    const wire = { version:_version, isSet, hasMany };
    if (isSet) { wire.data = data; }
    if (hasMany) { wire.id = id; }
    return wire;
}


export const pushWire = (data, hasMany, id)=>createWire(true, data, hasMany, id);
export const pullWire = (hasMany, id)=>createWire(false, undefined, hasMany, id);

export const validateWire = (wire, targetHasMany, targetIsSet)=>{
    targetHasMany = targetHasMany === true;

    valid(wire && typeof wire === "object" && !Array.isArray(wire), "must be an object");

    const { version, isSet, hasMany, data, id } = wire;

    valid(version === _version, `version mismatch. Expected '${_version}', received '${version}'`);
    valid(typeof isSet === "boolean", "isSet must be a boolean");
    valid(typeof hasMany === "boolean", "hasMany must be a boolean");
    valid(targetIsSet == null || isSet === targetIsSet, `isSet mismatch. Expected '${targetIsSet}', received '${isSet}'`);
    valid(hasMany === targetHasMany, `hasMany mismatch. Expected '${targetHasMany}', received '${hasMany}'`);

    return { isSet, data, id };
}
