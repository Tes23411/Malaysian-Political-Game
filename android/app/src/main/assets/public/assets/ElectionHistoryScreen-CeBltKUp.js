import{r as n,j as e,E as m}from"./index-B7e_9809.js";const f=({history:a,partiesMap:i,totalSeats:g,onClose:u,electionHistory:p,featuresMap:d})=>{const[o,c]=n.useState(null),{selectedElection:t,previousElection:r}=n.useMemo(()=>{if(o===null)return{selectedElection:null,previousElection:null};const s=a[o],l=o>0?a[o-1]:null;return{selectedElection:s,previousElection:l}},[o,a]),x=n.useMemo(()=>{const s=new Map(i);return r&&r.parties&&r.parties.forEach(l=>s.set(l.id,{...s.get(l.id)||{},...l})),t&&t.parties&&t.parties.forEach(l=>s.set(l.id,{...s.get(l.id)||{},...l})),s},[t,r,i]);return t?e.jsx("div",{className:"absolute inset-0 bg-black bg-opacity-75 z-[5000] flex items-center justify-center font-sans p-4",children:e.jsxs("div",{className:"relative w-full h-full max-w-5xl max-h-[95vh]",children:[e.jsx(m,{results:t.results,previousResults:r?r.results:new Map,detailedResults:t.detailedResults,previousDetailedResults:r?r.detailedResults:null,partiesMap:x,totalSeats:t.totalSeats,onClose:()=>c(null),electionDate:t.date,totalElectors:t.totalElectors,alliances:t.alliances||[],featuresMap:d}),e.jsx("button",{onClick:()=>c(null),className:"absolute top-2 left-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg text-sm z-10",children:"← Back to List"})]})}):e.jsxs("div",{className:"absolute inset-0 bg-black bg-opacity-75 z-[5000] flex items-center justify-center font-sans p-4",children:[e.jsxs("div",{className:"bg-gray-800 text-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col",children:[e.jsxs("div",{className:"flex justify-between items-center mb-4",children:[e.jsx("h2",{className:"text-3xl font-bold text-center",children:"Election History"}),e.jsx("button",{onClick:u,className:"text-3xl hover:text-red-500",children:"×"})]}),e.jsx("p",{className:"text-gray-400 mb-6",children:"Select an election year to view detailed results."}),e.jsx("div",{className:"flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar",children:a.length>0?[...a].reverse().map((s,l)=>{const b=a.length-1-l;return e.jsxs("button",{onClick:()=>c(b),className:"w-full text-center p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold text-lg",children:[s.date.getFullYear()," General Election"]},s.date.toISOString())}):e.jsx("p",{className:"text-center text-gray-500",children:"No election history available yet."})})]}),e.jsx("style",{children:`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.9);
        }
      `})]})};export{f as default};
