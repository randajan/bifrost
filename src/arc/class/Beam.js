import { mapList, registerExe } from "../tools";


const _privates = new WeakMap();


export class Beam {

    constructor(stateAdapter, routerAdapter) {

        if (!stateAdapter) {
            let state = {};
            stateAdapter = {
                get:_=>state,
                set:newState=>state=newState
            }
        }

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

        const _set = async (newState, ...args)=>{
            newState = await set(newState, ...args);
            _p.status = "ready";

            mapList(undefined, _p.watchers, newState, ...args);

            return newState;
        }

        _p.update = async (direction, newState, ...args)=>{
            try {
                _p.isPending = true;
                _p.status = direction;
                _p.pending = direction !== "tx" ? pull(get, ...args) : push(newState, get, ...args);
                _set(await _p.pending, ...args);
            } catch(err) {
                _p.error = err;
                _p.status = "error";
            }
            
            delete _p.pending;
            _p.isPending = false;
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

        if (this.isPending) { await _p.pending; }
        else { await _p.update("rx", null, ...args);  }

        return _p.status === "ready";
    }

    async get(...args) {
        const _p = _privates.get(this);
        if (_p.status === "init") { await this.refresh(...args); }
        else if (this.isPending) { await _p.pending; }

        return _p.get(...args);
    }

    async set(newState, ...args) {
        const _p = _privates.get(this);
        await this.get(...args); //it will make it ready

        await _p.update("tx", newState, ...args);

        return _p.get(...args);
    }


    async watch(watcher) {
        if (typeof watcher !== "function") { throw Error("Beam.watch(watcher) should be function"); }
        const { watchers } = _privates.get(this);

        return registerExe(watchers, watcher);
    }
}