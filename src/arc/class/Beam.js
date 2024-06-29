import { createQueue } from "@randajan/queue";
import { mapList, msg, registerExe } from "../tools";

const enumerable = true;
const _privates = new WeakMap();

const defaultStateAdapter = (opt)=>{
    let state;
    opt.get = _=>state;
    opt.set = newState=>state=newState;
}

const defaultStatesAdapter = (opt)=>{
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
    if (!opt.set) { opt.set = opt.get; }
    if (!opt.get) {
        if (opt.set) { throw Error(msg(".Beam(opt)", "contain set property without get", {channel})); }
        if (!isMultiState) { defaultStateAdapter(opt); }
        else { defaultStatesAdapter(opt); }
    }
    if (opt.trait) {
        const set = opt.set;
        opt.set = async (newState, ...args)=>set(await opt.trait(newState, ...args), ...args);
    }
    if (opt.queue) { opt.queue.pass = "last"; }
    
    return opt;
}

export class Beam {

    constructor(router, channel, routerAdapter, opt={}) {
        const { pull, push, register, isMultiState } = routerAdapter;
        const {
            get,
            set:setRaw,
            allowChanges,
            queue
        } = formatOpt(channel, opt, isMultiState);

        const _p = {
            channel,
            isPending:false,
            status:"init", // ["init", "error", "push", "pull", "ready"]
            watchers:[],
            error:null,
            pending:null,
            get
        }

        const afterSet = (state, args)=>{
            _p.status = "ready";
            mapList(undefined, _p.watchers, state, ...args);
            return state;
        }

        const set = async (newState, args)=>afterSet(await setRaw(newState, ...args), args);

        const setLocal = async (newState, args)=>{
            if (!allowChanges || allowChanges == "local") { return set(newState, args); }
            throw Error(msg(".Beam", "doesn't allow local changes", {channel}));
        }
        const setRemote = async (newState, ...args)=>{
            if (!allowChanges || allowChanges == "remote") { return set(newState, args); }
            throw Error(msg(".Beam", "doesn't allow remote changes", {channel}));
        };

        const update = async (status, newState, args)=>{
            let state;

            try {
                _p.isPending = true;
                _p.status = status;

                if (status === "pull") { _p.pending = pull ? pull(get, ...args) : get(...args); }
                else { _p.pending = push ? push(newState, get, ...args) : newState; }

                state = await _p.pending;

                if (status === "push" || pull) { state = await setLocal(state, args); }
                else { state = await afterSet(state, args); }
                
            } catch(err) {
                console.error(err);
                _p.error = err;
                _p.status = "error";
            }
            
            delete _p.pending;
            _p.isPending = false;

            return state;
        };

        _p.pull = args=>update("pull", undefined, args);
        const _push = (state, args)=>update("push", state, args);
        _p.push = !queue ? _push : createQueue(_push, queue);


        Object.defineProperties(this, {
            router:{ value:router},
            channel:{ enumerable, value:channel },
            isPending:{ enumerable, get:_=>_p.isPending },
            status:{ enumerable, get:_=>_p.status }
        });

        _privates.set(this, _p);

        register(this, setRemote);
    }

    async refresh(...args) {
        const { isPending, pull } = _privates.get(this);

        if (isPending) { return _p.pending; }
        return pull(args);

    }

    async get(...args) {
        const { isPending, status, get } = _privates.get(this);

        if (status === "init" || isPending) { return this.refresh(...args); }

        return get(...args);
    }

    async set(state, ...args) {
        const { isPending, status, push } = _privates.get(this);
        if (status === "init" || isPending) { await this.refresh(...args); }

        return push(state, args);
    }

    watch(watcher) {
        const { channel, watchers } = _privates.get(this);

        if (typeof watcher !== "function") { throw Error(msg(".Beam.watch(...)", "expect function", {channel})); }
        
        return registerExe(watchers, watcher);
    }
}