import { createQueue } from "@randajan/queue";
import { msg } from "../tools";

export const wrapWithQueue = (exe, queue)=>!queue ? exe : createQueue(exe, queue);
const wrapWithTrait = (exe, trait)=>!trait ? exe : async (s, ...a)=>exe(await trait(s, ...a), ...a);

export const stateExtract = (stateProperty, reply)=>{
    if (stateProperty == null) { return reply; }
    if (reply != null) { return reply[stateProperty]; }
}
export const stateAttach = (stateProperty, reply, state)=>{
    if (stateProperty == null) { return state; }
    if (reply == null) { return {[stateProperty]:state}; }
    reply[stateProperty] = state;
    return reply;
}

const defaultStateAdapter = opt=>{
    let state;
    opt.get = _=>state;
    opt.set = newState=>state=newState;
}

const defaultStatesAdapter = opt=>{
    const states = new Map();
    opt.get = (groupId)=>states.get(groupId);
    opt.set = (state, groupId)=>{
        if (state == null) { states.delete(groupId); }
        else { states.set(groupId, state); }
        return state;
    }
}

const formatReact = reactions=>{
    if (!reactions) { return; }
    return (state, args)=>{
        const { action, actionArguments } = (state || {});
        if (!action) { throw Error(msg(".Beam", `undefined action`)); }
        if (!reactions[action]) { throw Error(msg(".Beam", `unknown action '${action}'`)); }
        return reactions[action](...(actionArguments || []), ...args);
    }
}



export const formatOpt = (channel, opt, isMultiState)=>{
    if (!opt) { opt = {}; }
    if (!opt.set) {
        if (opt.get) { opt.allowChanges = "none"; }
        opt.set = opt.get;
    }
    if (!opt.get) {
        if (opt.set) { throw Error(msg(".Beam(opt)", "contain set property without get", {channel})); }
        if (!isMultiState) { defaultStateAdapter(opt); }
        else { defaultStatesAdapter(opt); }
    }
    if (opt.queue) {
        opt.queue.pass = "last";
        opt.queue.returnResult = true;
    }
    if (!opt.actions) { opt.actions = []; }
    opt.react = formatReact(opt.reactions);
    
    opt.set = wrapWithTrait(opt.set, opt.trait);
    
    return opt;
}