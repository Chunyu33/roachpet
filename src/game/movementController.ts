import type { Roach, ScreenBounds } from '../types/roach';
export const ROACH_SIZE = 96; const WALK_SPEED=42; const ESCAPE_SPEED=220;
export class MovementController {
  readonly bounds:ScreenBounds; private roach:Roach;
  constructor(bounds:ScreenBounds){this.bounds=bounds;this.roach={position:{x:bounds.width*.45,y:bounds.height*.5},direction:1,speed:WALK_SPEED,state:'WALK',stateTime:0};}
  get snapshot():Roach{return {...this.roach,position:{...this.roach.position}};}
  update(dt:number):Roach { const r=this.roach; r.stateTime+=dt; if(r.state==='WALK'&&r.stateTime>1.5&&Math.random()<dt*.7)r.direction=Math.random()<.5?-1:1; if(r.state==='ESCAPE'&&r.stateTime>.9){r.state='WALK';r.speed=WALK_SPEED;r.stateTime=0;} const jitter=r.state==='ESCAPE'?(Math.random()-.5)*1.2:(Math.random()-.5)*.35; const d=r.speed*dt; r.position.x+=r.direction*d; r.position.y+=jitter*d; const maxX=Math.max(0,this.bounds.width-ROACH_SIZE),maxY=Math.max(0,this.bounds.height-ROACH_SIZE); if(r.position.x<=0){r.position.x=0;r.direction=1;} if(r.position.x>=maxX){r.position.x=maxX;r.direction=-1;} r.position.y=Math.min(maxY,Math.max(0,r.position.y)); return this.snapshot; }
  escape(){this.roach.state='ESCAPE';this.roach.speed=ESCAPE_SPEED;this.roach.stateTime=0;this.roach.direction=Math.random()<.5?-1:1;}
}
