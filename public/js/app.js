/* Routes:
     /                    master template (read-only, from /default.json)
     /p/<id>              shared proposal (read-only)
     /admin/edit/<id>     admin editor for one proposal                     */
import { ProposalPage } from "./page.js";

const path = location.pathname.replace(/\/+$/, "");
const main = document.getElementById("main");

function showState(title, sub){
  main.innerHTML = `<div class="page-state"><b>${title}</b><span>${sub}</span></div>`;
}

async function boot(){
  const edit = path.match(/^\/admin\/edit\/([\w-]+)$/);
  if (edit){
    const { startEditor } = await import("./editor.js");
    return startEditor(edit[1]);
  }

  const shared = path.match(/^\/p\/([\w-]+)$/);
  const url = shared ? `/api/proposals/${shared[1]}` : "/default.json";
  try{
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    new ProposalPage(data.content || data).render();
  }catch(e){
    showState("Proposal not found", "This link may have expired or been removed");
  }
}
boot();
