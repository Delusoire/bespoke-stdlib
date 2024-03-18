export * from "./src/static.js";
import { S as _S } from "./src/expose/index.js";
export const S = _S;
import { Registrar } from "./src/registers/registers.js";
import { Subject, BehaviorSubject } from "https://esm.sh/rxjs";
export const createRegistrar = (mod)=>{
    if (!mod.registrar) {
        mod.registrar = new Registrar(mod.getIdentifier());
        const unloadJS = mod.unloadJS;
        mod.unloadJS = ()=>{
            mod.registrar.dispose();
            return unloadJS();
        };
    }
    return mod.registrar;
};
export const createStorage = (mod)=>{
    if (!mod.storage) {
        const hookedMethods = new Set([
            "getItem",
            "setItem",
            "removeItem"
        ]);
        mod.storage = new Proxy(globalThis.localStorage, {
            get (target, p, receiver) {
                if (typeof p === "string" && hookedMethods.has(p)) {
                    return (key, ...data)=>target[p](`module:${mod.getIdentifier()}:${key}`, ...data);
                }
                return target[p];
            }
        });
    }
    return mod.storage;
};
export const createLogger = (mod)=>{
    if (!mod.logger) {
        const hookedMethods = new Set([
            "debug",
            "error",
            "info",
            "log",
            "warn"
        ]);
        mod.logger = new Proxy(globalThis.console, {
            get (target, p, receiver) {
                if (typeof p === "string" && hookedMethods.has(p)) {
                    return (...data)=>target[p](`[${mod.getIdentifier()}]:`, ...data);
                }
                return target[p];
            }
        });
    }
    return mod.logger;
};
const PlayerAPI = S.Platform.getPlayerAPI();
const History = S.Platform.getHistory();
const newEventBus = ()=>{
    return {
        Player: {
            state_updated: new BehaviorSubject(PlayerAPI.getState()),
            status_changed: new Subject(),
            song_changed: new Subject()
        },
        History: {
            updated: new BehaviorSubject(History.location)
        }
    };
};
const EventBus = newEventBus();
export const createEventBus = (mod)=>{
    if (!mod.eventBus) {
        mod.eventBus = newEventBus();
        // TODO: come up with a nicer solution
        EventBus.Player.song_changed.subscribe(mod.eventBus.Player.song_changed);
        EventBus.Player.state_updated.subscribe(mod.eventBus.Player.state_updated);
        EventBus.Player.status_changed.subscribe(mod.eventBus.Player.status_changed);
        EventBus.History.updated.subscribe(mod.eventBus.History.updated);
        const unloadJS = mod.unloadJS;
        mod.unloadJS = ()=>{
            mod.eventBus.Player.song_changed.unsubscribe();
            mod.eventBus.Player.state_updated.unsubscribe();
            mod.eventBus.Player.status_changed.unsubscribe();
            mod.eventBus.History.updated.unsubscribe();
            return unloadJS();
        };
    }
    return mod.eventBus;
};
let cachedState = {};
PlayerAPI.getEvents().addListener("update", ({ data: state })=>{
    EventBus.Player.state_updated.next(state);
    if (state?.item?.uri !== cachedState?.item?.uri) EventBus.Player.song_changed.next(state);
    if (state?.isPaused !== cachedState?.isPaused || state?.isBuffering !== cachedState?.isBuffering) EventBus.Player.status_changed.next(state);
    cachedState = state;
});
History.listen((location)=>EventBus.History.updated.next(location));