import{i as c,ad as d}from"./index-7ykGtZ7O.js";import{j as o}from"./data-Z3GP67Id.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],E=c("CircleAlert",l);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],N=c("Copy",r);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]],x=c("KeyRound",i),y={NEW:{cls:"badge-info",dot:"bg-sky-500"},UNDER_REVIEW:{cls:"badge-navy",dot:"bg-navy-500"},QUOTATION_SENT:{cls:"badge-accent",dot:"bg-accent-500"},NEEDS_INFORMATION:{cls:"badge-warning",dot:"bg-amber-500"},WAITING_FOR_CUSTOMER:{cls:"badge-warning",dot:"bg-amber-500"},IN_PROGRESS:{cls:"badge-navy",dot:"bg-navy-600"},COMPLETED:{cls:"badge-success",dot:"bg-emerald-500"},CANCELLED:{cls:"badge-neutral",dot:"bg-slate-400"}},m=({status:e,size:s="md",audience:n="customer"})=>{const t=y[e]||{cls:"badge-neutral",dot:"bg-slate-400"};let a=d[e]||e;return n==="staff"&&(e==="WAITING_FOR_CUSTOMER"&&(a="Awaiting customer"),e==="NEW"&&(a="New")),o.jsxs("span",{className:`${t.cls} ${s==="sm"?"text-[11px]":""}`,children:[o.jsx("span",{className:`h-1.5 w-1.5 rounded-full ${t.dot}`,"aria-hidden":"true"}),a]})};export{E as C,x as K,m as S,N as a};
