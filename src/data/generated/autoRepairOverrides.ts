import type { PartTransform } from '../../core/types';

export interface PersistedAutoRepairOverride {
  transform: PartTransform;
  passes: number;
  baselineScore: number;
  finalScore: number;
}

export const AUTO_REPAIR_OVERRIDES:Readonly<Record<string,PersistedAutoRepairOverride>>=
/* AUTO_REPAIR_DATA_START */
{}
/* AUTO_REPAIR_DATA_END */;

export function autoRepairTransform(family:string,id:string):PartTransform|undefined{
  return AUTO_REPAIR_OVERRIDES[`${family}:${id}`]?.transform;
}
