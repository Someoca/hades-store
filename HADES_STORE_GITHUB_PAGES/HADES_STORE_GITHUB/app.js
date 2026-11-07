let catalog = [
  {id:"sample-01",name:"Homebrew de exemplo",category:"Homebrews",version:"1.0",icon:"H",description:"Item demonstrativo para mostrar como o catálogo aparece. Substitua pelos dados de um projeto homebrew legítimo.",size:"A definir",downloadUrl:""},
  {id:"sample-02",name:"Utilitário de exemplo",category:"Aplicativos",version:"1.0",icon:"⚙",description:"Espaço reservado para um aplicativo de código aberto compatível com seu ambiente.",size:"A definir",downloadUrl:""},
  {id:"sample-03",name:"Emulador de exemplo",category:"Emuladores",version:"1.0",icon:"⌁",description:"Espaço reservado para um emulador distribuído pelo autor ou por fonte autorizada.",size:"A definir",downloadUrl:""}
];

let activeCategory = "Todos";
const grid = document.querySelector("#grid");
const statusEl = document.querySelector(".status");
const search = document.querySelector("#search");
const empty = document.querySelector("#empty");
const dialog = document.querySelector("#details");

function render(){
  const q = search.value.trim().toLowerCase();
  const items = catalog.filter(x => (activeCategory==="Todos" || x.category===activeCategory) &&
    (x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)));
  grid.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "app-card"; card.tabIndex = 0; card.setAttribute("role","button");
    const isGame=item.category==="Jogos";card.dataset.cover=String((parseInt(item.icon,10)-1+8)%8);const visual=isGame?`<div class="game-physical" aria-hidden="true"><div class="game-disc"><span></span></div><div class="game-cover"><img class="game-cover-art" src="${escapeHtml(item.imageUrl||'')}" alt="Capa de ${escapeHtml(item.name)}" loading="lazy"><span class="cover-fallback">${escapeHtml(item.name)}</span></div></div>`:`<div class="app-icon">${escapeHtml(item.icon||'H')}</div>`;card.innerHTML = `${visual}<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="card-bottom"><span class="tag">${escapeHtml(item.category.toUpperCase())}</span><span class="version">${String(item.version)==="PS4"?"PS4":"v"+escapeHtml(item.version)}</span></div>`;
    card.addEventListener("click",()=>showDetails(item));
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showDetails(item)}});
    const coverImage=card.querySelector(".game-cover-art");if(coverImage)coverImage.addEventListener("error",()=>{coverImage.remove();card.querySelector(".game-cover").classList.add("cover-image-missing")});
    grid.appendChild(card);
  });
  empty.hidden = items.length>0;
  document.querySelector("#count-apps").textContent = catalog.length.toString().padStart(2,"0");
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showDetails(item){
  document.querySelector("#detail-icon").textContent=item.icon;
  document.querySelector("#detail-category").textContent=item.category.toUpperCase();
  document.querySelector("#detail-title").textContent=item.name;
  document.querySelector("#detail-description").textContent=item.description;
  document.querySelector("#detail-meta").textContent=`Versão ${item.version} · ${item.size}${item.language?' · '+item.language:''}${item.format?' · Formato: '+item.format:''}`;
  const link=document.querySelector("#detail-download");
  if(item.downloadUrl && /^https:\/\//i.test(item.downloadUrl)){link.href=item.downloadUrl;link.style.display="inline-flex";link.textContent="VER NA PLAYSTATION STORE ↗";}
  else{link.removeAttribute("href");link.style.display="none";}
  dialog.showModal();
}
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");activeCategory=btn.dataset.category;render();
}));
search.addEventListener("input",render);
document.querySelector(".close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
function updateClock(){document.querySelector("#clock").textContent=new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date())}
updateClock();setInterval(updateClock,30000);render();

// Em hospedagem HTTP, o catálogo externo é carregado automaticamente.
// Se abrir index.html diretamente, os itens demonstrativos acima continuam disponíveis.
fetch("catalog/catalog.json")
  .then(response => { if (!response.ok) throw new Error("Catálogo indisponível"); return response.json(); })
  .then(data => { if (Array.isArray(data)) { catalog = data; render(); if(statusEl) statusEl.innerHTML = "<i></i> CATÁLOGO ONLINE"; } })
  .catch(() => { if(statusEl) statusEl.innerHTML = "<i></i> CATÁLOGO LOCAL"; });

// Atalhos do DualShock 4: D-pad navega pelos controles focáveis.
// Enter/Espaço equivalem ao botão X; Escape/Backspace equivalem ao botão O.
function focusables(){
  return [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),.app-card[tabindex="0"]')]
    .filter(el=>el.getClientRects().length && !el.closest('dialog:not([open])'));
}
document.addEventListener("keydown",e=>{
  const inSearch=document.activeElement===search;
  if(e.key==="Escape" || e.key==="Backspace" && !inSearch){
    if(dialog.open){dialog.close();e.preventDefault();return;}
    if(inSearch){search.blur();e.preventDefault();return;}
  }
  if(e.key==="F1"){e.preventDefault();search.focus();return;}
  if(["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key) && !dialog.open && !inSearch){
    const els=focusables(), current=els.indexOf(document.activeElement);
    if(!els.length)return;
    let next=current<0?0:current;
    if(e.key==="ArrowRight"||e.key==="ArrowDown")next=(next+1)%els.length;
    else next=(next-1+els.length)%els.length;
    els[next].focus();els[next].scrollIntoView({block:"nearest",inline:"nearest"});e.preventDefault();
  }
  if(e.key==="ContextMenu" || (e.key==="Escape" && !dialog.open && !inSearch)){
    e.preventDefault();search.focus();
  }
});
document.addEventListener("click",e=>{
  const card=e.target.closest(".app-card");
  document.querySelectorAll(".app-card.selected").forEach(el=>el.classList.remove("selected"));
  if(card)card.classList.add("selected");
});
