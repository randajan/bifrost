import { bifrost } from "./testRouter";
import "./../../../dist/client/react";

//Test beam
export const beam = window.beam = bifrost.createBeam("munin", {
    remoteStateProp:"text",
    actions:["write", "erase"]
});