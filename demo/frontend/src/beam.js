import { bifrost } from "./testRouter";
import "./../../../dist/esm/client/react/index.mjs";

//Test beam
export const fieldBeam = window.beam = bifrost.createBeam("field", {
    onResponse:"text",
});

export const colorBeam = bifrost.createBeam("color", {});

export const testBeam = bifrost.createBeam("test", {});