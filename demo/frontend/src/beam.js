import { bifrost } from "./testRouter";
import { createBeam } from "./../../../dist/esm/client/beam.mjs";

import "./../../../dist/esm/client/react/index.mjs";


//Test beam
export const fieldBeam = window.beam = createBeam(bifrost, "field", {
    unfold:"text",
});

export const colorBeam = createBeam(bifrost, "color", {});

export const testBeam = createBeam(bifrost, "test", {});