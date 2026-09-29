'use client';
import {learningLabel} from '@/lib/locale/learning';
export default function PrintButton({language='en'}:{language?:string}){return <button onClick={()=>window.print()}>{learningLabel('print',language)}</button>;}
