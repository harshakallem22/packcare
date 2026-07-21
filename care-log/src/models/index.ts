export { User } from './User';
export type { UserDoc } from './User';
export { Household } from './Household';
export type { HouseholdDoc } from './Household';
export { Membership } from './Membership';
export type { MembershipDoc } from './Membership';
export { Pet } from './Pet';
export type { PetDoc } from './Pet';
export { CareEvent } from './CareEvent';
export type { CareEventDoc } from './CareEvent';

import { User } from './User';
import { Household } from './Household';
import { Membership } from './Membership';
import { Pet } from './Pet';
import { CareEvent } from './CareEvent';

/**
 * Build all index definitions. Must run at boot before accepting writes - the
 * safety guarantees depend on the partial unique indexes actually existing.
 */
export async function syncAllIndexes(): Promise<void> {
  await Promise.all([
    User.syncIndexes(),
    Household.syncIndexes(),
    Membership.syncIndexes(),
    Pet.syncIndexes(),
    CareEvent.syncIndexes(),
  ]);
}
