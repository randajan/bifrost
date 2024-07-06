import { createQueue } from "@randajan/queue";
import { mapList, msg, registerExe } from "../tools";

const enumerable = true;
const _privates = new WeakMap();

const wrapWithQueue = (exe, queue)=>!queue ? exe : createQueue(exe, queue);
const wrapWithTrait = (exe, trait)=>!trait ? exe : async (s, ...a)=>exe(await trait(s, ...a), ...a);

const stateExtract = (stateProperty, reply)=>{
    if (stateProperty == null) { return reply; }
    if (reply != null) { return reply[stateProperty]; }
}
const stateAttach = (stateProperty, reply, state)=>{
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

const formatOpt = (channel, opt, isMultiState)=>{
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

    opt.set = wrapWithTrait(opt.set, opt.trait);
    
    return opt;
}

export class Beam {

    constructor(router, channel, routerAdapter, opt={}) {
        const { pull:pullRaw, push:pushRaw, register, isMultiState } = routerAdapter;
        const {
            get,
            set:setRaw,
            remoteStateProp,
            localStateProp,
            allowChanges:ac,
            queue
        } = formatOpt(channel, opt, isMultiState);

        const _p = {
            channel,
            status:"init", // ["init", "error", "push", "pull", "ready"]
            watchers:[],
            error:null,
            pending:null,
            remoteStateProp,
            localStateProp,
            get
        }

        const propagate = (state, args)=>{ mapList(undefined, _p.watchers, state, ...args); }
        const set = async (state, args)=>{
            const local = await setRaw(state, ...args);
            propagate(stateExtract(localStateProp, local), args); //should propagate only state!!!
            return local;
        }

        const setRx = async (state, ...args)=>{ //client beam called push
            if (ac && ac != "remote") { throw Error(msg(".Beam", "doesn't allow remote changes", {channel})); }
            return set(state, args);
        };

        const push = async (state, args)=>{
            if (ac && ac != "local") { throw Error(msg(".Beam", "doesn't allow local changes", {channel})); }
            if (!pushRaw) { return set(state, args); }
            const remote = await pushRaw(state, ...args);
            const local = await set(stateExtract(remoteStateProp, remote), args);
            return stateAttach(remoteStateProp, remote, stateExtract(localStateProp, local));
        }

        const pull = !pullRaw ? async args=>propagate(await get(...args), args) : async args=>set(await pullRaw(...args), args);

        const processWithStatus = async (status, pending)=>{
            let state;
            _p.status = status;
            _p.pending = pending;

            try {
                state = await _p.pending;
                _p.status = "ready";
            } catch(err) {
                console.error(err);
                _p.error = err;
                _p.status = "error";
            }

            delete _p.pending;
            return state;
        }

        _p.pull = args=>processWithStatus("pull", pull(args));
        _p.push = wrapWithQueue((state, args)=>processWithStatus("push", push(state, args)), queue);


        Object.defineProperties(this, {
            router:{ value:router},
            channel:{ enumerable, value:channel },
            isPending:{ enumerable, get:_=>!!_p.pending },
            status:{ enumerable, get:_=>_p.status },
            allowChanges:{ enumerable, value:ac }
        });

        _privates.set(this, _p);

        register(this, setRx);
    }

    async refresh(...args) {
        const { pending, pull} = _privates.get(this);
        if (pending) { await pending; } else { await pull(args); }
    }

    async get(...args) {
        const { pending, status, pull, get } = _privates.get(this);
        if (pending) { await pending; }
        else if (status === "init") { await pull(args); }
        return get(...args);
    }

    async set(state, ...args) {
        const { pending, push } = _privates.get(this);
        if (pending) { await pending; }
        return push(state, args);
    }

    watch(watcher) {
        const { channel, watchers } = _privates.get(this);

        if (typeof watcher !== "function") { throw Error(msg(".Beam.watch(...)", "expect function", {channel})); }
        
        return registerExe(watchers, watcher);
    }

    extractRemoteState(reply) {
        const { remoteStateProp } = _privates.get(this);
        return stateExtract(remoteStateProp, reply);
    }

    extractLocalState(reply) {
        const { localStateProp } = _privates.get(this);
        return stateExtract(localStateProp, reply);
    }
}