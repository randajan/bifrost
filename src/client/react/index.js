import { useVault } from "@randajan/vault-kit/react";

/**
 * @preserve
 * React hook for binding a component to one Beam/Vault cell.
 *
 * Additional arguments select the Vault cell, so `useBeam(beam, id)` binds to
 * an indexed Beam when the Beam was created with `hasMany:true`.
 *
 * @param {import("@randajan/vault-kit").Vault} vault Beam/Vault instance.
 * @param {...*} args Optional cell id and extra Vault arguments.
 * @returns {Object} Vault React port with status, data, error, reply, set, act, isStatus, and confirm.
 */
export const useBeam = useVault;
export default useBeam;

