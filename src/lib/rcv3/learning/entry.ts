// Only the existing learning destination may be carried through this signup flow.
export function learningSignupReturn(search:string){
 const value=new URLSearchParams(search).get('next');
 if(!value)return '/dashboard';
 try{const url=new URL(value,'https://rc.invalid');if(url.origin!=='https://rc.invalid'||!['/rcv3/learn','/rcv4/learn'].includes(url.pathname))return '/dashboard';return url.pathname+url.search;}catch{return '/dashboard';}
}
