export const DRAW_DURATION_MS=50000;
export const DRAW_TURNS=40;
export type WheelPerson={ticket:number;label:string};
export function wheelSegments(count:number){const n=Math.min(Math.max(count,0),12);return Array.from({length:n},(_,i)=>({from:Math.floor(i*count/n)+1,to:Math.floor((i+1)*count/n)}))}
export function winningAngle(count:number,ticket:number){const ranges=wheelSegments(count);const sector=ranges.findIndex(r=>ticket>=r.from&&ticket<=r.to);if(sector<0)throw new Error('Número fora da roleta.');return (sector+.5)*360/ranges.length}
export function visiblePeople(people:WheelPerson[],winnerTicket?:number,max=16){if(people.length<=max)return people;const indices=Array.from({length:max},(_,i)=>Math.floor(i*people.length/max));const winner=people.findIndex(p=>p.ticket===winnerTicket);if(winner>=0&&!indices.includes(winner)){let nearest=0;for(let i=1;i<indices.length;i++)if(Math.abs(indices[i]-winner)<Math.abs(indices[nearest]-winner))nearest=i;indices[nearest]=winner}return indices.sort((a,b)=>a-b).map(i=>people[i])}
export function namedWinningAngle(people:WheelPerson[],ticket:number){const index=people.findIndex(p=>p.ticket===ticket);if(index<0)throw new Error('Ganhador fora da roleta.');return(index+.5)*360/people.length}
