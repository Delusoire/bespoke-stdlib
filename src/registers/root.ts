import { type Predicate, Registry } from "./registry.js";
import { matchLast } from "/hooks/util.js";
import type { ReactElement, SetStateAction } from "react";
import { registerTransform } from "../../mixin.js";
class R extends Registry<React.ReactElement, void> {
	register(item: ReactElement, predicate: Predicate<void>): ReactElement {
		super.register(item, predicate);
		refreshRoot.then(refresh => refresh());
		return item;
	}

	unregister(item: ReactElement): ReactElement {
		super.unregister(item);
		refreshRoot.then(f => f());
		return item;
	}
}

const registry = new R();
export default registry;

let resolveRefreshRoot = undefined;
const refreshRoot = new Promise<() => void>(r => {
	resolveRefreshRoot = r;
});

globalThis.__renderRootChildren = registry.getItems.bind(registry);
registerTransform<React.Dispatch<SetStateAction<number>>>({
	transform: emit => str => {
		const croppedInput = str.match(/.*"data-right-sidebar-hidden"/)![0];
		const children = matchLast(croppedInput, /children:([a-zA-Z_\$][\w\$]*)/g)[1];
		str = str.replace(/("data-right-sidebar-hidden")/, `[(${children}=[${children},__renderRootChildren()].flat(),$1)]`);

		const react = matchLast(croppedInput, /([a-zA-Z_\$][\w\$]*)\.useCallback/g)[1];
		const index = matchLast(croppedInput, /return/g).index;
		str = `${str.slice(0, index)}const[rand,setRand]=${react}.useState(0);__setRootRand=setRand;${str.slice(index)}`;
		Object.defineProperty(globalThis, "__setRootRand", {
			set: emit,
		});
		return str;
	},
	then: setRootRand => {
		resolveRefreshRoot(() => setRootRand(Math.random()));
	},
	glob: /^\/xpui\.js/,
});
