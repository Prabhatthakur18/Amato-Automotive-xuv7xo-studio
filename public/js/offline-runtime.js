(()=>{var y={designs:8,sections:10,gallery:8,callouts:10,grid:16,palette:4},M={gallery:{label:"Image gallery",hint:"Switchable views, e.g. Front / Rear cabin"},seat:{label:"Seat diagram",hint:"One image with numbered detail callouts"},grid:{label:"Card grid",hint:"Cards with an image and a name"}},z=[{x:50,y:14},{x:40,y:30},{x:38,y:52},{x:62,y:42},{x:56,y:60},{x:66,y:74}];var I=(n,t=0)=>({gallery:()=>({name:"New view",sub:"Describe this view",img:""}),grid:()=>({name:"New element",img:""}),seat:()=>({t:"New detail",d:"Describe this detail.",pos:{...z[t%6]},img:""})})[n](),D=n=>({gallery:()=>({items:[I("gallery")]}),grid:()=>({items:[I("grid")]}),seat:()=>({img:"",callouts:[]})})[n]();var E=n=>n==="seat"?"callouts":"items",H=n=>y[n==="seat"?"callouts":n];function j(n){var i,o,l,d,r,u,c,$,p,v,L,f;let t=n.sections||{},e=[{id:"interior",type:"gallery",title:(o=(i=t.interior)==null?void 0:i.title)!=null?o:"The Complete Interior",sub:(d=(l=t.interior)==null?void 0:l.sub)!=null?d:""},{id:"signature",type:"seat",title:(u=(r=t.signature)==null?void 0:r.title)!=null?u:"The Signature \u2014 Seat Cover",sub:($=(c=t.signature)==null?void 0:c.sub)!=null?$:""},{id:"elements",type:"grid",title:(v=(p=t.elements)==null?void 0:p.title)!=null?v:"Cabin Elements",sub:(f=(L=t.elements)==null?void 0:L.sub)!=null?f:""}],s=["door","floor","dash","steering","boot","rear"],a=n.elementLabels||{};return{schema:2,vehicle:n.vehicle,brand:n.brand,labels:n.labels,sections:e,designs:n.designs.map(m=>{var x;return{name:m.name,theme:m.theme,tm:!!m.tm,desc:m.desc,palette:m.palette,blocks:{interior:{items:(n.angles||[]).map((b,S)=>{var k;return{name:b.name,sub:b.sub,img:((k=m.images)==null?void 0:k[`angle${S+1}`])||""}})},signature:{img:((x=m.images)==null?void 0:x.seat)||"",callouts:m.callouts||[]},elements:{items:s.map(b=>{var S;return{name:a[b]||b,img:((S=m.images)==null?void 0:S[b])||""}})}}}})}}function q(n){let t=(n==null?void 0:n.schema)===2?n:j(n);t.labels={themeLabel:"Design Theme",vehicleLabel:"Vehicle",paletteLabel:"Color Palette",seatTag:"Front Seat",...t.labels||{}},t.brand={logoLeft:"/assets/brand/amato.png",logoRight:"/assets/brand/mahindra.png",...t.brand||{}},t.sections=Array.isArray(t.sections)?t.sections:[],t.designs=Array.isArray(t.designs)&&t.designs.length?t.designs:[{name:"Design",theme:"",desc:"",palette:[],blocks:{}}];for(let e of t.designs){e.palette=Array.isArray(e.palette)?e.palette:[],e.blocks=e.blocks||{};for(let s of t.sections){let a=e.blocks[s.id]||(e.blocks[s.id]=D(s.type)),i=E(s.type);Array.isArray(a[i])||(a[i]=[])}}return t}var B=[{x:50,y:14},{x:40,y:30},{x:38,y:52},{x:62,y:42},{x:56,y:60},{x:66,y:74}],h=n=>String(n).padStart(2,"0"),g=n=>String(n!=null?n:"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function T(n,t){return t.split(".").reduce((e,s)=>e==null?e:e[s],n)}var w=class{constructor(t,e={}){this.data=q(t),this.editable=!!e.editable,this.onRendered=e.onRendered||(()=>{}),this.di=0,this.ai={},this.main=document.getElementById("main"),window.addEventListener("resize",()=>requestAnimationFrame(()=>this.drawSigLines())),O()}get design(){return this.data.designs[this.di]}dp(){return`designs.${this.di}`}t(t){let e=g(T(this.data,t));return this.editable?`<span data-edit="${t}">${e}</span>`:e}m(t){let e=g(T(this.data,t));return this.editable?`<span data-sync="${t}">${e}</span>`:e}ctl(t,e,s="",a="",i=""){return this.editable?`<button type="button" class="ed-ctl ${a}" data-cmd="${t}" ${s}${i?` title="${g(i)}"`:""}>${e}</button>`:""}slotHTML(t,e,s=""){let a=T(this.data,t)||"",i=a?`<b>${g(e)}</b>`:`<b>${g(e)}</b><i>${this.editable?"no image \u2014 click Replace":"image coming soon"}</i>`;return`<div class="slot ${s}" data-src="${g(a)}" data-alt="${g(e)}" data-img-path="${t}">
      <div class="ph">${i}</div>
    </div>`}renderChrome(){let t=this.data.brand||{},e=(s,a,i)=>`<img alt="${a}" src="${g(s)}" data-logo-path="${i}"/>`;document.getElementById("logoAmato").innerHTML=e(t.logoLeft,"Amato Automotive","brand.logoLeft"),document.getElementById("logoMahindra").innerHTML=e(t.logoRight,"Mahindra","brand.logoRight"),document.querySelector(".footer-logo.amato").innerHTML=e(t.logoLeft,"Amato Automotive","brand.logoLeft"),document.querySelector(".footer-logo.mahindra").innerHTML=e(t.logoRight,"Mahindra","brand.logoRight"),document.title=`${this.data.vehicle} \u2014 Amato Automotive \xD7 Mahindra`}render(){let t=this.data,e=this.design,s=this.dp();this.renderChrome();let a=t.designs.length>1||this.editable,i=this.editable?`<div class="ed-row ed-design-tools">
        ${t.designs.length<y.designs?this.ctl("design-add","+ Add design","","","Copies the current design as a starting point"):""}
        ${t.designs.length>1?this.ctl("design-move","\u25C0",'data-dir="-1"',"","Move this design left")+this.ctl("design-move","\u25B6",'data-dir="1"',"","Move this design right"):""}
        ${t.designs.length>1?this.ctl("design-del","\xD7 Delete design","","danger"):""}
      </div>`:"",o=t.sections.filter(l=>this.editable||this.hasContent(l));this.main.innerHTML=`
    <!-- masthead -->
    <div class="masthead rv">
      <div>
        <h2>${this.t(`${s}.name`)}${e.tm?"<sup>\u2122</sup>":""}</h2>
        <div class="sub"><span class="rule"></span><span class="lbl-dim">${this.m("labels.themeLabel")} \u2014 ${this.m(`${s}.theme`)} \xB7 ${this.m("vehicle")}</span></div>
      </div>
      <div class="mast-right">
        ${a?`<div class="dtabs" role="tablist" aria-label="Designs">
          ${t.designs.map((l,d)=>`<button class="dtab ${d===this.di?"active":""}" data-i="${d}">Design ${h(d+1)}</button>`).join("")}
        </div>`:""}
        ${i}
        <p>${this.t(`${s}.desc`)}</p>
      </div>
    </div>

    <div class="meta-strip rv">
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.themeLabel")}</h4><div class="theme-name">${this.t(`${s}.theme`)}</div></div>
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.vehicleLabel")}</h4><div class="theme-name">${this.t("vehicle")}</div></div>
      <div class="meta-cell"><h4 class="lbl">${this.t("labels.paletteLabel")}</h4>
        <div class="swatches">${e.palette.map((l,d)=>`<div class="swatch" data-sw="${d}"><div class="chip" style="background:${g(l.hex)}"></div><span>${this.t(`${s}.palette.${d}.label`)}</span></div>`).join("")}</div>
      </div>
    </div>

    ${this.addSectionRow(0,o.length===0)}
    ${o.map((l,d)=>this.sectionHTML(l,d)+this.addSectionRow(t.sections.indexOf(l)+1)).join("")}
    `,this.wire(),this.onRendered(this)}hasContent(t){let e=this.design.blocks[t.id];return e?t.type==="seat"?!!e.img||e.callouts.length>0:e.items.length>0:!1}addSectionRow(t,e=!1){return!this.editable||this.data.sections.length>=y.sections||t===0&&!e?"":`<div class="ed-add-sec">
      <span>+ Add section here</span>
      ${Object.entries(M).map(([s,a])=>this.ctl("sec-add",a.label,`data-type="${s}" data-at="${t}"`,"",a.hint)).join("")}
    </div>`}secHead(t,e){let s=this.data.sections.indexOf(t),a=this.data.sections.length-1,i=this.editable?`<div class="ed-sec-tools">
        <span class="ed-sec-type">${M[t.type].label}</span>
        ${s>0?this.ctl("sec-move","\u2191",`data-sid="${t.id}" data-dir="-1"`,"","Move section up"):""}
        ${s<a?this.ctl("sec-move","\u2193",`data-sid="${t.id}" data-dir="1"`,"","Move section down"):""}
        ${this.ctl("sec-del","\xD7 Delete section",`data-sid="${t.id}"`,"danger")}
      </div>`:"";return`<div class="sec-head">
        <span class="num">${h(e+1)}</span>
        <div class="titles"><h3>${this.t(`sections.${s}.title`)}</h3><span>${this.t(`sections.${s}.sub`)}</span></div>
        <span class="rule"></span>
        ${i}
      </div>`}sectionHTML(t,e){let s={gallery:"interior",seat:"signature",grid:"elements"}[t.type],a={gallery:()=>this.galleryHTML(t),seat:()=>this.seatHTML(t),grid:()=>this.gridHTML(t)}[t.type]();return`<section class="${s} rv" data-sid="${t.id}">${this.secHead(t,e)}${a}</section>`}itemTools(t,e,s,a="\xD7"){if(!this.editable)return"";let i=`data-sid="${t.id}" data-i="${e}"`;return`<div class="ed-item-tools">
      ${e>0?this.ctl("item-move","\u25C0",`${i} data-dir="-1"`,"","Move earlier"):""}
      ${e<s-1?this.ctl("item-move","\u25B6",`${i} data-dir="1"`,"","Move later"):""}
      ${this.ctl("item-del",a,i,"danger","Delete")}
    </div>`}addItemBtn(t,e,s=""){return!this.editable||this.design.blocks[t.id][E(t.type)].length>=H(t.type)?"":this.ctl("item-add",e,`data-sid="${t.id}"`,s)}galleryHTML(t){let e=`${this.dp()}.blocks.${t.id}`,s=this.design.blocks[t.id].items,a=s.length,i=Math.min(this.ai[t.id]||0,Math.max(0,a-1));return this.ai[t.id]=i,a?`
      <div class="angle-stage" data-gallery="${t.id}">
        ${s.map((o,l)=>this.slotHTML(`${e}.items.${l}.img`,o.name,l===i?"on":"")).join("")}
        <div class="angle-hud"><span class="lbl" data-hud="name">${this.t(`${e}.items.${i}.name`)}</span><span data-hud="sub">${this.t(`${e}.items.${i}.sub`)}</span></div>
        <div class="angle-count" data-hud="count"><b>${h(i+1)}</b> / ${h(a)}</div>
      </div>
      <div class="angle-thumbs" style="--n:${a}">
        ${s.map((o,l)=>this.editable?`<div class="angle-thumb ${l===i?"on":""}" data-i="${l}" role="button" tabindex="0">
            <div class="tmeta"><span class="tnum">${h(l+1)}</span><span class="tname">${this.t(`${e}.items.${l}.name`)}</span></div>
          </div>`:`<button class="angle-thumb ${l===i?"on":""}" data-i="${l}">
            <div class="tmeta"><span class="tnum">${h(l+1)}</span><span class="tname">${this.m(`${e}.items.${l}.name`)}</span></div>
          </button>`).join("")}
      </div>
      ${this.editable?`<div class="ed-row ed-gallery-tools">
        ${this.addItemBtn(t,"+ Add view")}
        <span class="ed-note">Selected view:</span>
        ${this.itemTools(t,i,a,"\xD7 Delete view")}
      </div>`:""}`:`<div class="ed-empty">No views in this gallery yet. ${this.addItemBtn(t,"+ Add view")}</div>`}calloutHTML(t,e,s,a){let i=`${this.dp()}.blocks.${t.id}`;return`<div class="callout" data-i="${s}">
      <div class="cbody">
        <div class="cthumb" style="--thumb-pos:50% 50%;--thumb-scale:1">${this.slotHTML(`${i}.callouts.${s}.img`,e.t)}</div>
        <div class="ctext">
          <span class="cnum">${h(s+1)}</span>
          <span class="ct">${this.t(`${i}.callouts.${s}.t`)}</span>
          <span class="cd">${this.t(`${i}.callouts.${s}.d`)}</span>
        </div>
        ${this.itemTools(t,s,a)}
      </div>
      <span class="anchor" id="${t.id}-an${s}"></span>
    </div>`}seatHTML(t){let e=`${this.dp()}.blocks.${t.id}`,a=this.design.blocks[t.id].callouts,i=a.length,o=Math.ceil(i/2);return`
      <div class="sig-wrap" data-seat="${t.id}">
        <svg class="sig-lines" aria-hidden="true"></svg>
        <div class="sig-cols">
          <div class="sig-side left">
            ${a.slice(0,o).map((l,d)=>this.calloutHTML(t,l,d,i)).join("")}
          </div>
          <div class="sig-stage">
            ${this.slotHTML(`${e}.img`,"Seat Cover")}
            <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>
            ${a.map((l,d)=>{let r=l.pos||B[d%B.length];return`<span class="marker" id="${t.id}-mk${d}" data-i="${d}" style="left:${+r.x}%;top:${+r.y}%">
                <span class="ring"></span><span class="core"></span><span class="mnum">${h(d+1)}</span>
              </span>`}).join("")}
            <div class="sig-tag">${this.m("vehicle")} \xB7 <b>${this.m(`${this.dp()}.name`)}</b> \xB7 ${this.t("labels.seatTag")}</div>
          </div>
          <div class="sig-side right">
            ${a.slice(o).map((l,d)=>this.calloutHTML(t,l,d+o,i)).join("")}
          </div>
        </div>
      </div>
      ${this.editable?`<div class="ed-row">${this.addItemBtn(t,"+ Add detail")}<span class="ed-note">Drag the numbered dots to place each detail on the seat.</span></div>`:""}`}gridHTML(t){let e=`${this.dp()}.blocks.${t.id}`,s=this.design.blocks[t.id].items,a=s.length,i=this.editable&&a<y.grid?`<button type="button" class="el-card ed-add-card" data-cmd="item-add" data-sid="${t.id}"><span>+ Add card</span></button>`:"";return`<div class="el-grid">
        ${s.map((o,l)=>`<div class="el-card">
            <span class="corner"></span>
            ${this.slotHTML(`${e}.items.${l}.img`,o.name)}
            <div class="el-meta"><span class="enum">${h(l+1)}</span><div><h5>${this.t(`${e}.items.${l}.name`)}</h5></div>${this.itemTools(t,l,a,"\xD7 Delete card")}</div>
          </div>`).join("")}
        ${i}
      </div>`}wire(){let t=this.main;t.querySelectorAll(".dtab").forEach(s=>s.onclick=()=>{this.di=+s.dataset.i,this.ai={},this.render()}),t.querySelectorAll(".angle-stage[data-gallery]").forEach(s=>{let a=s.dataset.gallery;s.parentElement.querySelectorAll(".angle-thumb").forEach(i=>i.onclick=()=>this.setAngle(a,+i.dataset.i))}),this.drawSigLines(),t.querySelectorAll(".sig-wrap[data-seat]").forEach(s=>{let a=s.dataset.seat;s.querySelectorAll(".callout[data-i]").forEach(i=>{let o=+i.dataset.i,l=document.getElementById(`${a}-mk${o}`),d=()=>document.getElementById(`${a}-ln${o}`),r=()=>{var c;l.classList.add("hot"),(c=d())==null||c.classList.add("hot")},u=()=>{var c;l.classList.remove("hot"),(c=d())==null||c.classList.remove("hot")};i.addEventListener("mouseenter",r),i.addEventListener("mouseleave",u),l.addEventListener("mouseenter",()=>{i.classList.add("hot"),r()}),l.addEventListener("mouseleave",()=>{i.classList.remove("hot"),u()})})}),this.hydrateSlots(t);let e=new IntersectionObserver(s=>{s.forEach(a=>{a.isIntersecting&&(a.target.classList.add("in"),e.unobserve(a.target))})},{threshold:.12});t.querySelectorAll(".rv").forEach(s=>e.observe(s))}setAngle(t,e){if(this.editable)return this.ai[t]=e,this.render();this.ai[t]=e;let s=this.main.querySelector(`.angle-stage[data-gallery="${t}"]`),a=s.parentElement,i=this.design.blocks[t].items,o=`${this.dp()}.blocks.${t}`;s.querySelectorAll(".slot").forEach((l,d)=>l.classList.toggle("on",d===e)),a.querySelectorAll(".angle-thumb").forEach((l,d)=>l.classList.toggle("on",d===e)),s.querySelector('[data-hud="name"]').innerHTML=this.t(`${o}.items.${e}.name`),s.querySelector('[data-hud="sub"]').innerHTML=this.t(`${o}.items.${e}.sub`),s.querySelector('[data-hud="count"]').innerHTML=`<b>${h(e+1)}</b> / ${h(i.length)}`}hydrateSlots(t){t.querySelectorAll(".slot[data-src]").forEach(e=>this.loadSlot(e))}loadSlot(t){var a,i;(a=t.querySelector(":scope > img"))==null||a.remove(),(i=t.querySelector(":scope > .zoom-btn"))==null||i.remove(),delete t.dataset.zoomReady,t.classList.remove("has-img");let e=t.dataset.src;if(!e)return;let s=new Image;s.alt=t.dataset.alt||"",s.onload=()=>{t.dataset.src===e&&(t.appendChild(s),t.classList.add("has-img"),N(t),requestAnimationFrame(()=>this.drawSigLines()))},s.src=e}drawSigLines(){this.main.querySelectorAll(".sig-wrap[data-seat]").forEach(t=>{let e=t.dataset.seat,s=t.querySelector(".sig-lines"),a=t.getBoundingClientRect();if(a.width===0)return;if(s.setAttribute("viewBox",`0 0 ${a.width} ${a.height}`),window.matchMedia("(max-width: 1080px)").matches){s.innerHTML="";return}let i="";t.querySelectorAll(".callout[data-i]").forEach(o=>{let l=+o.dataset.i,d=document.getElementById(`${e}-an${l}`),r=document.getElementById(`${e}-mk${l}`);if(!d||!r)return;let u=d.getBoundingClientRect(),c=r.getBoundingClientRect(),$=u.left-a.left,p=u.top-a.top,v=c.left+c.width/2-a.left,L=c.top+c.height/2-a.top,f=$+(v-$)*.35,m=r.classList.contains("hot")?' class="hot"':"";i+=`<polyline id="${e}-ln${l}"${m} points="${$},${p} ${f},${p} ${v},${L}"/>
                 <circle cx="${$}" cy="${p}" r="2.5" fill="#b01e2e" opacity=".7"/>`}),s.innerHTML=i})}};function _(){return`<button class="zoom-btn" type="button" aria-label="View image large" title="View image large">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"></path></svg>
  </button>`}function C(n,t=""){var i;let e=document.getElementById("zoomModal"),s=document.getElementById("zoomImage"),a=document.getElementById("zoomCaption");!e||!s||(s.src=n,s.alt=t,a.textContent=t||"",e.classList.add("open"),e.setAttribute("aria-hidden","false"),document.body.classList.add("zoom-open"),(i=document.getElementById("zoomClose"))==null||i.focus())}function A(){let n=document.getElementById("zoomModal");n&&(n.classList.remove("open"),n.setAttribute("aria-hidden","true"),document.body.classList.remove("zoom-open"))}function N(n){var e;let t=n.querySelector(":scope > img");!t||n.dataset.zoomReady||(n.dataset.zoomReady="1",n.insertAdjacentHTML("beforeend",_()),(e=n.querySelector(".zoom-btn"))==null||e.addEventListener("click",s=>{s.stopPropagation(),C(t.currentSrc||t.src,t.alt)}),t.addEventListener("dblclick",()=>C(t.currentSrc||t.src,t.alt)))}var R=!1;function O(){var n,t;R||(R=!0,(n=document.getElementById("zoomClose"))==null||n.addEventListener("click",A),(t=document.getElementById("zoomModal"))==null||t.addEventListener("click",e=>{e.target.id==="zoomModal"&&A()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&A()}))}new w(window.__DATA__).render();})();
