import { mapList, registerExe } from "../tools";


const _privates = new WeakMap();

export const defaultStateAdapter = (stateAdapter)=>{
    if (stateAdapter) { return stateAdapter; }
    let state = undefined;
    return stateAdapter = {
        get:_=>state,
        set:newState=>state=newState
    }
}

export const defaultStatesAdapter = (stateAdapter)=>{
    if (stateAdapter) { return stateAdapter; }
    const states = new Map();
    return stateAdapter = {
        get:(groupId)=>states.get(groupId),
        set:(state, groupId)=>{
            if (state == null) { states.delete(groupId); }
            else { states.set(groupId, state); }
            return state;
        }
    }
}

export class Beam {

    constructor(routerAdapter, stateAdapter) {

        const { pull, push, register} = routerAdapter;
        const { get, set } = stateAdapter;

        const _p = {
            isPending:false,
            status:"init", // ["init", "error", "tx", "rx", "ready"]
            watchers:[],
            error:null,
            pending:null,
            get
        }

        const afterSet = (state, ...args)=>{
            _p.status = "ready";
            mapList(undefined, _p.watchers, state, ...args);
            return state;
        }

        const _set = async (newState, ...args)=>afterSet(await set(newState, ...args), ...args);

        _p.update = async (dir, newState, ...args)=>{
            let state;

            try {
                _p.isPending = true;
                _p.status = dir;

                if (dir === "rx") { _p.pending = pull ? pull(get, ...args) : get(...args); }
                else { _p.pending = push ? push(newState, get, ...args) : newState; }

                state = await _p.pending;

                if (dir === "tx" || pull) { state = await _set(state, ...args); }
                else { state = await afterSet(state, ...args); }
                
            } catch(err) {
                _p.error = err;
                _p.status = "error";
            }
            
            delete _p.pending;
            _p.isPending = false;

            return state;
        },

        Object.defineProperties(this, {
            isPending:{ enunmerable:true, get:_=>_p.isPending },
            status:{ enumerable:true, get:_=>_p.status },
        });

        _privates.set(this, _p);

        register(this, _set);
    }

    async refresh(...args) {
        const _p = _privates.get(this);

        if (this.isPending) { return _p.pending; }
        return _p.update("rx", undefined, ...args);

    }

    async get(...args) {
        const _p = _privates.get(this);

        if (_p.status === "init" || this.isPending) {
            return this.refresh(...args);
        }

        return _p.get(...args);
    }

    async set(state, ...args) {
        const _p = _privates.get(this);
        if (_p.status === "init" || this.isPending) {
            await this.refresh(...args);
        }

        return _p.update("tx", state, ...args);
    }


    watch(watcher) {
        if (typeof watcher !== "function") { throw Error("Beam.watch(watcher) should be function"); }
        const { watchers } = _privates.get(this);

        return registerExe(watchers, watcher);
    }
}