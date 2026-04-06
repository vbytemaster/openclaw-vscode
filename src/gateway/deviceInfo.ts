import { loadOrCreateDeviceIdentity, loadStoredDeviceToken } from './deviceAuth';

export function getWsDeviceInfo() {
  const identity = loadOrCreateDeviceIdentity();
  const token = loadStoredDeviceToken();
  return {
    deviceId: identity.deviceId,
    hasStoredDeviceToken: Boolean(token?.token),
    storedTokenRole: token?.role,
    storedTokenScopes: token?.scopes,
    storedTokenIssuedAtMs: token?.issuedAtMs,
    storedTokenUpdatedAtMs: token?.updatedAtMs,
  };
}
