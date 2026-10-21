import skins from './skins.json' with {type:'json'};
export type CatalogItem={id:string;kind:'skin'|'gift';name:string;image?:string};
export const catalog:CatalogItem[]=[...(skins as CatalogItem[]),{id:'gift',kind:'gift',name:'GIFT CARD',image:'/gift-card.svg'}];
export function money(amount:number){return amount>0?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount):''}
