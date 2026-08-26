export type RoachState = 'IDLE' | 'WALK' | 'ESCAPE';
export interface ScreenBounds { width:number; height:number; }
export interface Position { x:number; y:number; }
export interface Roach { position:Position; direction:number; speed:number; state:RoachState; stateTime:number; }
