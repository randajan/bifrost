import { useVault } from "@randajan/vault-kit/react";

/**
 * @preserve
 * React hook for binding a component to one Beam/Vault cell.
 *
 * `path` selects the Vault cell. For a Beam created with `depth:1`, pass
 * `["profile"]`; for deeper Beams, pass every path segment in order.
 *
 * @param {import("@randajan/vault-kit").Vault} vault Beam/Vault instance.
 * @param {Array} [path=[]] Vault path array for the target Beam cell.
 * @param {boolean} [autoInit=true] Starts the first remote pull immediately.
 * @returns {Object} Vault React port with status, data, error, reply, set, act, isStatus, and confirm.
 */
export const useBeam = useVault;
export default useBeam;

