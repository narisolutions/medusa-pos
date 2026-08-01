import { hashPin, isLegacyPinHash, verifyPin } from "@/utils/pos/register";
import { logger } from "@/utils/logger";
import { updatePreferences } from ".";

/**
 * Verifies a manager PIN and transparently re-hashes legacy (unsalted SHA-256)
 * entries once the raw PIN is known to be correct — the only moment an upgrade
 * is possible. A failed write leaves the old hash in place; it still verifies.
 */
export async function verifyManagerPin(
  raw: string,
  stored: string
): Promise<boolean> {
  const ok = await verifyPin(raw, stored);
  if (!ok || !isLegacyPinHash(stored)) return ok;

  try {
    await updatePreferences({ register: { managerPinHash: await hashPin(raw) } });
  } catch (error) {
    void logger.warn(`manager PIN hash upgrade failed: ${String(error)}`);
  }
  return true;
}
