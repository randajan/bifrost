import { bifrost } from "./testRouter";
import "./../../../dist/esm/client/react/index.mjs";

//Test beam
export const beam = window.beam = bifrost.createBeam("munin", {
    onResponse:"text",
});