import './styles.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Wastzera | Drops da comunidade',icons:{icon:'/mark.svg'},description:'A comunidade joga junto. Acompanhe os sorteios e os resultados do Wastzera.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
