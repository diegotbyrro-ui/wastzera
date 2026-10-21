export const DRAW_DURATION_MS=50000;
export const DRAW_TURNS=40;
export type WheelPerson={ticket:number;label:string};
export function wheelSegments(count:number){const n=Math.min(Math.max(count,0),12);return Array.from({length:n},(_,i)=>({from:Math.floor(i*count/n)+1,to:Math.floor((i+1)*count/n)}))}
export function winningAngle(count:number,ticket:number){const ranges=wheelSegments(count);const sector=ranges.findIndex(r=>ticket>=r.from&&ticket<=r.to);if(sector<0)throw new Error('Número fora da roleta.');return (sector+.5)*360/ranges.length}
// Cada inscrição mantém seu próprio setor, na ordem dos números de participação.
export function visiblePeople(people:WheelPerson[],_winnerTicket?:number){return people}
export function namedWinningAngle(people:WheelPerson[],ticket:number){const index=people.findIndex(p=>p.ticket===ticket);if(index<0)throw new Error('Ganhador fora da roleta.');return(index+.5)*360/people.length}
