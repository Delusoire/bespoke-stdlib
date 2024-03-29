import type { RegisterTransformFN } from "/hooks/transforms/transform.js";

export let registerTransform: RegisterTransformFN;
export default async function (rt: RegisterTransformFN) {
	registerTransform = rt;
	await import("./src/expose/index.js");
	await import("./src/registers/registers.js");
}
