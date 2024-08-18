import { mapList, msg, registerExe } from "../tools";
import { wrapWithQueue, stateExtract, stateAttach, formatOpt } from "./helpers";

const enumerable = true;
const _privates = new WeakMap();

export class Beam {

    constructor(router, channel, routerAdapter, opt={}) {
        const { pull:pullRaw, push:pushRaw, register, isMultiState } = routerAdapter;
        const {
            get,
            set:setRaw,
            remoteStateProp,
            localStateProp,
            allowChanges:ac,
            queue,
            actions,
            react,
            onError
        } = formatOpt(channel, opt, isMultiState);

        const _p = {
            channel,
            status:"init", // ["init", "error", "push", "pull", "ready"]
            watchers:[],
            error:null,
            pending:null,
            remoteStateProp,
            localStateProp,
            get,
            actions,
        }

        const propagate = (state, args)=>{ mapList(undefined, _p.watchers, state, ...args); }
        const set = async (state, args)=>{
            let local;
            try {
                if (react) { state = await react(state, args); }
                local = await setRaw(state, ...args);
            } catch(error) {
                if (!onError) { throw error; }
                local = await onError(error, ...args);
            }
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
            isDone:{ enumerable, get:_=>_p.status === "ready" || _p.status === "error" },
            status:{ enumerable, get:_=>_p.status },
            allowChanges:{ enumerable, value:ac },
        });

        _privates.set(this, _p);

        this.applyActions(this.set.bind(this), this);

        register(this, setRx);
    }

    async refresh(...args) {
        const { pending, pull} = _privates.get(this);
        if (pending) { await pending; } else { await pull(args); }
    }

    getRaw(...args) {
        const { status, pull, get } = _privates.get(this);
        if (status === "init") { pull(args); }
        return get(...args);
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

    applyActions(setMethod, target={}) {
        const { actions } = _privates.get(this);
        for (let action of actions) {
            const act = (...a)=>setMethod({action, actionArguments:a});
            Object.defineProperty(target, action, { value:act });
        }
        return target;
    }
}