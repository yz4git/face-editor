import type { Vec2 } from '../../core/types';

export interface PersistedAutoRepairTriangle {
  role:string;
  shade:number;
  points:readonly [Vec2,Vec2,Vec2];
}
export interface PersistedAutoRepairGeometry {
  kind:string;
  triangles:readonly PersistedAutoRepairTriangle[];
  profile:string;
  beforeScore:number|null;
  afterScore:number|null;
}

export const AUTO_REPAIR_GEOMETRY:Readonly<Record<string,PersistedAutoRepairGeometry>>=
/* AUTO_REPAIR_GEOMETRY_START */
{}
/* AUTO_REPAIR_GEOMETRY_END */;

export function autoRepairGeometry(kind:string,id:string):PersistedAutoRepairGeometry|undefined{
  return AUTO_REPAIR_GEOMETRY[`${kind}:${id}`];
}
