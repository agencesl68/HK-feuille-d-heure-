/* =============================================================================
   HK TERRASSEMENT — feuille d'heures (logique appli employé)
   Champs calqués sur le modèle Excel : Chantier / Trajet aller / Matinée /
   Après-midi / Trajet retour. Totaux journée & trajet séparés.
   ============================================================================= */
(function () {
  "use strict";

  const CFG = window.HK_CONFIG || {};
  const EMPLOYES = window.HK_EMPLOYES || [];
  const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

  const STATUTS = [
    { id:"travail",  label:"Travaillé", cat:"work" },
    { id:"conge",    label:"Congé",     cat:"off"  },
    { id:"absence",  label:"Absence",   cat:"off"  },
    { id:"repos",    label:"Repos",     cat:"off"  },
    { id:"vacances", label:"Vacances",  cat:"off"  },
    { id:"maladie",  label:"Maladie",   cat:"off"  }
  ];
  const STATUTS_SPECIAUX = ["conge","absence","repos","vacances","maladie"];
  const CLE_IDENTITE = "hk_identite";
  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  const app = document.getElementById("app");
  const who = document.getElementById("who");

  // ---- Écran de chargement (splash) -----------------------------------------
  (function(){
    const s = document.getElementById("splash");
    if (!s) return;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(()=>{ s.classList.add("out"); setTimeout(()=>{ if(s.parentNode) s.remove(); }, 550); }, reduce ? 300 : 1100);
  })();

  // ---- Identité (saisie une fois, mémorisée) --------------------------------
  function slug(s){
    return s.toString().toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g,"")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  }
  function identiteURL(){
    const p = new URLSearchParams(location.search);
    const id = p.get("id") || (location.hash ? decodeURIComponent(location.hash.replace(/^#/,"")) : "");
    if (!id) return null;
    const e = EMPLOYES.find(x => x.id === id);
    return e ? { id:e.id, nom:e.nom, role:e.role } : null;
  }
  function identiteSauvee(){ try { return JSON.parse(localStorage.getItem(CLE_IDENTITE)); } catch(e){ return null; } }
  function sauverIdentite(idt){ localStorage.setItem(CLE_IDENTITE, JSON.stringify(idt)); }

  let employe = identiteURL() || identiteSauvee();
  if (employe && identiteURL()) sauverIdentite(employe);

  function renderOnboarding(){
    if (who) who.innerHTML = "";
    const options = EMPLOYES.map(e => `<option value="${e.id}">${e.nom}</option>`).join("");
    app.innerHTML = `
      <div class="panel" style="margin-top:26px">
        <div class="eyebrow">Feuille d'heures</div>
        ${EMPLOYES.length ? `
        <div class="field mt">
          <span class="lab">Je suis</span>
          <select class="in" id="ob-liste">
            <option value="">Choisir mon nom</option>${options}
            <option value="__autre">Autre…</option>
          </select>
        </div>` : ""}
        <div id="ob-manuel" class="${EMPLOYES.length ? "hide" : ""}">
          <div class="field ${EMPLOYES.length ? "mt" : ""}">
            <span class="lab">Nom et prénom</span>
            <input type="text" class="in" id="ob-nom" placeholder="Nom et prénom" autocomplete="name">
          </div>
          <div class="field mt">
            <span class="lab">Poste</span>
            <div class="toggle">
              <button type="button" id="ob-chantier" aria-pressed="true">Chantier</button>
              <button type="button" id="ob-chauffeur" aria-pressed="false">Chauffeur</button>
            </div>
          </div>
        </div>
        <button class="btn-send" id="ob-ok" style="margin-top:22px">Continuer</button>
        <div class="hint" style="text-align:center">Mémorisé sur cet appareil</div>
      </div>`;

    let role = "chantier";
    const manuel = document.getElementById("ob-manuel");
    const liste = document.getElementById("ob-liste");
    const bC = document.getElementById("ob-chantier");
    const bK = document.getElementById("ob-chauffeur");
    bC.addEventListener("click", ()=>{ role="chantier"; bC.setAttribute("aria-pressed","true"); bK.setAttribute("aria-pressed","false"); });
    bK.addEventListener("click", ()=>{ role="chauffeur"; bK.setAttribute("aria-pressed","true"); bC.setAttribute("aria-pressed","false"); });
    if (liste) liste.addEventListener("change", e=>{ manuel.classList.toggle("hide", e.target.value !== "__autre"); });

    document.getElementById("ob-ok").addEventListener("click", ()=>{
      if (liste && liste.value && liste.value !== "__autre"){
        const e = EMPLOYES.find(x=>x.id===liste.value);
        employe = { id:e.id, nom:e.nom, role:e.role };
      } else {
        const nom = (document.getElementById("ob-nom").value || "").trim();
        if (nom.length < 2) return toast("Saisissez votre nom.", true);
        employe = { id:slug(nom), nom:nom, role:role };
      }
      sauverIdentite(employe); demarrer();
    });
  }

  // ---- Dates / heures --------------------------------------------------------
  function todayISO(){ const d=new Date(),off=d.getTimezoneOffset()*60000; return new Date(d-off).toISOString().slice(0,10); }
  function jourNom(iso){ return JOURS[new Date(iso+"T12:00:00").getDay()]; }
  function jourFrLong(iso){ return new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
  function dureeH(a,b){ if(!a||!b) return 0; const[ha,ma]=a.split(":").map(Number),[hb,mb]=b.split(":").map(Number);
    const d=((hb*60+mb)-(ha*60+ma))/60; return d>0?d:0; }
  function heuresAttenduesJour(iso){ const j=jourNom(iso); return (CFG.heuresAttendues&&CFG.heuresAttendues[j]!=null)?CFG.heuresAttendues[j]:8; }
  function fmtH(h){ const s=Math.round(h*100)/100; return (Number.isInteger(s)?s:s.toFixed(2).replace(/0$/,"")); }
  function fmtHU(h){ return fmtH(h)+" h"; }
  function fmtHM(h){ if(h<=0) return "0 h"; const t=Math.round(h*60),hh=Math.floor(t/60),mm=t%60; return hh+" h"+(mm?(" "+String(mm).padStart(2,"0")):""); }
  const sentKey = iso => "hk_sent_"+employe.id+"_"+iso;

  // ---- État ------------------------------------------------------------------
  let estChauffeur, state, vue = "jour";
  function initState(){
    estChauffeur = employe.role === "chauffeur";
    state = { date:todayISO(), statut:"travail", chantier:"", trajetAllerDep:"", trajetAllerArr:"",
      matineeDebut:"", matineeFin:"", apremDebut:"", apremFin:"", trajetRetourDep:"", trajetRetourArr:"", commentaire:"" };
  }
  function heuresJournee(){ if(state.statut!=="travail") return 0; return dureeH(state.matineeDebut,state.matineeFin)+dureeH(state.apremDebut,state.apremFin); }
  function heuresTrajet(){ if(state.statut!=="travail"||estChauffeur) return 0; return dureeH(state.trajetAllerDep,state.trajetAllerArr)+dureeH(state.trajetRetourDep,state.trajetRetourArr); }
  function pauseMidi(){ return dureeH(state.matineeFin,state.apremDebut); }

  // ---- Rendu -----------------------------------------------------------------
  function renderNav(){
    return `<div class="tabs">
      <button class="tab" data-vue="jour" aria-selected="${vue==='jour'}">Ma journée</button>
      <button class="tab" data-vue="semaine" aria-selected="${vue==='semaine'}">Ma semaine</button>
    </div>`;
  }
  function bindShell(){
    document.querySelectorAll(".tab[data-vue]").forEach(b=>b.addEventListener("click",()=>{ vue=b.dataset.vue; render(); }));
    const sw=document.getElementById("f-switch"); if(sw) sw.addEventListener("click",switchUser);
  }
  function render(){
    if(vue==="semaine"){ app.innerHTML = renderNav()+semaineView(); bindShell(); return; }
    const deja = localStorage.getItem(sentKey(state.date));
    if(deja){ app.innerHTML = renderNav()+doneView(JSON.parse(deja)); bindShell(); bindDone(); return; }
    app.innerHTML = renderNav()+dayView(); bindShell(); bind();
  }
  function dayView(){
    const special = STATUTS_SPECIAUX.includes(state.statut);
    return `
      <div class="daybar">
        <div>
          <div class="eyebrow" style="margin-bottom:6px">Journée</div>
          <div class="day">${jourNom(state.date)}</div>
          <div class="day-sub">${jourFrLong(state.date)}</div>
        </div>
        <input type="date" class="date-input" id="f-date" value="${state.date}" max="${todayISO()}">
      </div>

      <div class="panel">
        <div class="eyebrow">Type de journée</div>
        <div class="seg">
          ${STATUTS.map(s=>`<button class="pill ${s.cat}" data-statut="${s.id}" aria-pressed="${state.statut===s.id}">
            <span class="dot"></span><span>${s.label}</span></button>`).join("")}
        </div>
      </div>

      ${special ? renderBanner() : renderTravail()}

      <button class="btn-send" id="f-send">Envoyer</button>
      <div class="foot">${employe.nom} · <a href="#" id="f-switch">changer</a></div>`;
  }

  function renderBanner(){
    const s=STATUTS.find(x=>x.id===state.statut);
    return `<div class="panel">
      <div class="banner"><span class="mk"></span>Journée déclarée : ${s.label.toUpperCase()}</div>
      <div class="field mt"><span class="lab">Commentaire (facultatif)</span>
      <textarea class="in" id="f-com" placeholder="Précision éventuelle">${state.commentaire}</textarea></div></div>`;
  }

  function paire(lD,iD,vD,lF,iF,vF){
    return `<div class="two">
      <div class="field"><span class="lab">${lD}</span><input type="time" class="in" id="${iD}" value="${vD}"></div>
      <div class="field"><span class="lab">${lF}</span><input type="time" class="in" id="${iF}" value="${vF}"></div></div>`;
  }

  function renderTravail(){
    const attendu=heuresAttenduesJour(state.date), hj=heuresJournee(), ht=heuresTrajet(), pm=pauseMidi();
    return `
      <div class="panel">
        <div class="eyebrow">Chantier</div>
        <input type="text" class="in" id="f-chantier" placeholder="Nom du chantier" value="${state.chantier}">
        <div class="quick">
          <button class="primary" id="q-standard">Journée standard · ${attendu} h</button>
          <button id="q-clear">Effacer</button></div>
      </div>
      ${estChauffeur?"":`<div class="panel"><div class="eyebrow">Trajet aller</div>
        ${paire("Départ","f-tad",state.trajetAllerDep,"Arrivée","f-taa",state.trajetAllerArr)}</div>`}
      <div class="panel">
        <div class="eyebrow">Matinée</div>${paire("Début","f-md",state.matineeDebut,"Fin","f-mf",state.matineeFin)}
        <div class="eyebrow mt">Après-midi</div>${paire("Début","f-ad",state.apremDebut,"Fin","f-af",state.apremFin)}
        <div class="hint">Pause de midi&nbsp;: <b id="r-pause" style="color:var(--ink-2)">${fmtHM(pm)}</b></div>
      </div>
      ${estChauffeur?"":`<div class="panel"><div class="eyebrow">Trajet retour</div>
        ${paire("Départ","f-trd",state.trajetRetourDep,"Arrivée","f-tra",state.trajetRetourArr)}</div>`}
      <div class="panel"><div class="field"><span class="lab">Commentaire (facultatif)</span>
        <textarea class="in" id="f-com" placeholder="Remarque">${state.commentaire}</textarea></div></div>

      <div class="ledger">
        <div class="ledger-row total">
          <span class="k">Total journée</span>
          <span class="big num" id="r-journee">${fmtH(hj)}<span class="u">h</span></span>
        </div>
        <div class="ledger-row sub"><span class="k">Attendu</span><span class="v">${attendu} h</span></div>
        ${estChauffeur?"":`<div class="ledger-row sub"><span class="k">Trajet</span><span class="v" id="r-trajet">${fmtHU(ht)}</span></div>`}
      </div>`;
  }

  function doneView(payload){
    return `
      <div class="panel" style="margin-top:16px"><div class="done">
        <div class="tick">${TICK}</div>
        <h3>Feuille envoyée</h3>
        <p>${jourFrLong(state.date)}</p>
        <p>Envoyée à <span class="strong">${payload._envoyeHeure||"—"}</span></p>
        ${payload.statut==="travail"
          ? `<p><span class="strong">${fmtHU(payload.heuresJournee)}</span> de travail${payload.heuresTrajet?` · ${fmtHU(payload.heuresTrajet)} trajet`:""}</p>`
          : `<p><span class="strong" style="color:var(--danger)">${payload.statutLabel}</span></p>`}
        <a class="link" id="f-autre" href="#">Remplir un autre jour</a>
      </div></div>
      <div class="foot">${employe.nom} · <a href="#" id="f-switch">changer</a></div>`;
  }
  function bindDone(){
    document.getElementById("f-autre").addEventListener("click", e=>{ e.preventDefault();
      const d=prompt("Date à remplir (AAAA-MM-JJ) :", todayISO());
      if(d && /^\d{4}-\d{2}-\d{2}$/.test(d)){ state.date=d; render(); }});
  }

  // ---- Vue « Ma semaine » ----------------------------------------------------
  function isoOf(d){ const off=d.getTimezoneOffset()*60000; return new Date(d-off).toISOString().slice(0,10); }
  function weekMonday(iso){ const d=new Date(iso+"T12:00:00"),dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return isoOf(d); }
  function addDays(iso,n){ const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return isoOf(d); }
  function fmtJourCourt(iso){ return new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"}); }

  function semaineView(){
    const monday=weekMonday(todayISO()), auj=todayISO();
    let totalTrav=0, totalTrajet=0, attenduTot=0, rows="";
    for(let i=0;i<7;i++){
      const iso=addDays(monday,i), jn=JOURS[new Date(iso+"T12:00:00").getDay()], att=heuresAttenduesJour(iso);
      const raw=localStorage.getItem(sentKey(iso)), entry=raw?JSON.parse(raw):null;
      if(i===6 && !entry) continue;   // dimanche affiché seulement s'il est rempli (samedi toujours)
      attenduTot+=att;
      let cls,val,sub="";
      if(entry){
        if(entry.statut==="travail"){ cls="work"; totalTrav+=entry.heuresJournee||0; totalTrajet+=entry.heuresTrajet||0;
          val=`<span class="wk-val">${fmtHU(entry.heuresJournee||0)}</span>`;
          sub=entry.chantier?`<div class="wk-sub">${entry.chantier}</div>`
             :(entry.heuresTrajet?`<div class="wk-sub">trajet ${fmtHU(entry.heuresTrajet)}</div>`:"");
        } else { cls="off"; val=`<span class="wk-val off">${entry.statutLabel}</span>`; }
      } else { cls="empty"; val=`<span class="wk-val empty">—</span>`;
        sub = iso<=auj ? `<div class="wk-sub">à remplir</div>` : ""; }
      rows+=`<div class="wk-row ${cls}"><span class="rail"></span>
        <div><div class="wk-day">${jn}</div>${sub}</div>${val}</div>`;
    }
    return `
      <div class="wk-head"><div><div class="t">Ma semaine</div>
        <div class="s">du ${fmtJourCourt(monday)} au ${fmtJourCourt(addDays(monday,5))}</div></div></div>
      <div class="panel">${rows}</div>
      <div class="ledger">
        <div class="ledger-row total"><span class="k">Total semaine</span>
          <span class="big num">${fmtH(totalTrav)}<span class="u">h</span></span></div>
        <div class="ledger-row sub"><span class="k">Attendu</span><span class="v">${attenduTot} h</span></div>
        ${totalTrajet?`<div class="ledger-row sub"><span class="k">Trajet</span><span class="v">${fmtHU(totalTrajet)}</span></div>`:""}
      </div>
      <div class="foot">${employe.nom} · <a href="#" id="f-switch">changer</a></div>`;
  }

  // ---- Événements ------------------------------------------------------------
  function bind(){
    document.getElementById("f-date").addEventListener("change", e=>{ state.date=e.target.value||todayISO(); render(); });
    document.querySelectorAll(".pill[data-statut]").forEach(b=>b.addEventListener("click",()=>{ state.statut=b.dataset.statut; render(); }));
    const map=[["f-chantier","chantier"],["f-tad","trajetAllerDep"],["f-taa","trajetAllerArr"],["f-md","matineeDebut"],
      ["f-mf","matineeFin"],["f-ad","apremDebut"],["f-af","apremFin"],["f-trd","trajetRetourDep"],["f-tra","trajetRetourArr"],["f-com","commentaire"]];
    map.forEach(([id,key])=>{ const el=document.getElementById(id); if(el) el.addEventListener("input",e=>{ state[key]=e.target.value; refreshRecap(); }); });
    const qs=document.getElementById("q-standard"), qc=document.getElementById("q-clear");
    if(qs) qs.addEventListener("click",()=>{ const std=jourNom(state.date)==="vendredi"?CFG.journeeStandard.vendredi:CFG.journeeStandard.semaine;
      Object.assign(state,{matineeDebut:std.matineeDebut,matineeFin:std.matineeFin,apremDebut:std.apremDebut,apremFin:std.apremFin}); render(); });
    if(qc) qc.addEventListener("click",()=>{ Object.assign(state,{trajetAllerDep:"",trajetAllerArr:"",matineeDebut:"",matineeFin:"",
      apremDebut:"",apremFin:"",trajetRetourDep:"",trajetRetourArr:""}); render(); });
    document.getElementById("f-send").addEventListener("click", envoyer);
  }
  function refreshRecap(){
    const j=document.getElementById("r-journee"); if(j) j.innerHTML=fmtH(heuresJournee())+'<span class="u">h</span>';
    const t=document.getElementById("r-trajet"); if(t) t.textContent=fmtHU(heuresTrajet());
    const p=document.getElementById("r-pause"); if(p) p.textContent=fmtHM(pauseMidi());
  }
  function switchUser(e){ if(e) e.preventDefault();
    if(confirm("Changer d'utilisateur sur cet appareil ?")){ localStorage.removeItem(CLE_IDENTITE); location.hash=""; location.reload(); } }

  // ---- Envoi -----------------------------------------------------------------
  function validate(){
    if(localStorage.getItem(sentKey(state.date))) return "Feuille déjà envoyée pour cette date.";
    if(state.statut==="travail"){
      if(heuresJournee()<=0) return "Renseignez au moins la matinée ou l'après-midi.";
      if((state.matineeDebut&&state.matineeFin&&dureeH(state.matineeDebut,state.matineeFin)<=0) ||
         (state.apremDebut&&state.apremFin&&dureeH(state.apremDebut,state.apremFin)<=0)) return "Une heure de fin est avant l'heure de début.";
    }
    return null;
  }
  function buildPayload(){
    const now=new Date();
    const envoyeHeure=now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:CFG.timezone||"Europe/Paris"});
    const st=STATUTS.find(s=>s.id===state.statut), trav=state.statut==="travail", attendu=heuresAttenduesJour(state.date);
    const hj=heuresJournee(), ht=heuresTrajet();
    return { source:"app-hk", employeId:employe.id, employeNom:employe.nom, role:employe.role, date:state.date,
      jourSemaine:jourNom(state.date), statut:state.statut, statutLabel:st?st.label:state.statut,
      chantier:trav?state.chantier:"", trajetAllerDepart:(trav&&!estChauffeur)?state.trajetAllerDep:"",
      trajetAllerArrivee:(trav&&!estChauffeur)?state.trajetAllerArr:"", matineeDebut:trav?state.matineeDebut:"",
      matineeFin:trav?state.matineeFin:"", apresMidiDebut:trav?state.apremDebut:"", apresMidiFin:trav?state.apremFin:"",
      trajetRetourDepart:(trav&&!estChauffeur)?state.trajetRetourDep:"", trajetRetourArrivee:(trav&&!estChauffeur)?state.trajetRetourArr:"",
      pauseMidiHeures:trav?Math.round(pauseMidi()*100)/100:0, heuresJournee:Math.round(hj*100)/100,
      heuresTrajet:Math.round(ht*100)/100, heuresAttendues:attendu, heuresSupp:trav?Math.round((hj-attendu)*100)/100:0,
      commentaire:state.commentaire||"", envoyeLe:now.toISOString(), _envoyeHeure:envoyeHeure };
  }
  async function envoyer(){
    const err=validate(); if(err) return toast(err,true);
    const btn=document.getElementById("f-send"); btn.disabled=true; btn.textContent="Envoi…";
    const payload=buildPayload();
    try{
      if(!CFG.webhookUrl || CFG.webhookUrl.includes("REMPLACEZ")){ await new Promise(r=>setTimeout(r,450)); }
      else { const res=await fetch(CFG.webhookUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); if(!res.ok) throw new Error("HTTP "+res.status); }
      localStorage.setItem(sentKey(state.date),JSON.stringify(payload)); toast("Feuille envoyée"); render();
    }catch(e){ btn.disabled=false; btn.textContent="Envoyer"; toast("Échec de l'envoi, réessayez.",true); }
  }

  let toastTimer;
  function toast(msg,isErr){ let t=document.querySelector(".toast"); if(!t){ t=document.createElement("div"); document.body.appendChild(t); }
    t.className="toast"+(isErr?" err":""); t.textContent=msg; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.remove(),3200); }

  function demarrer(){
    if(who) who.innerHTML=`<div class="nom">${employe.nom}</div><div class="role">${employe.role==="chauffeur"?"Chauffeur":"Chantier"}</div>`;
    initState(); render();
  }
  if(employe) demarrer(); else renderOnboarding();
})();
