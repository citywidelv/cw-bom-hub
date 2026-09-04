/* CW BOM Hub shared script. Build 2026-09-04a.
   Gate, header, cascading nav, webhook helper, Asana project registry.
   Every page: <link bom.css> ... <div id="gate"> + <div id="app" class="hidden">, then
   this file, then BOM.init({page:'...'}). Data lives in Google Sheets through the
   CW Solicitations Apps Script (VendorDirectory.gs, kinds vd_*). */
(function(){
var WEBHOOK = "https://script.google.com/macros/s/AKfycbzfNnrpidCbWB1DeUNgXvRhDFMQgApfpn-3C9GU45wMEHcJpWFl8ZQVo6PUBSRfEVfRdg/exec";
var KEY = "cwBomHubPass";          // BOM passcode, this hub
var OPSKEY = "cwOpsHubPass";        // team passcode cached by the Ops Hub (same origin, also accepted)
var NAMEKEY = "cwBomName";
var PORTAL = "https://citywidelv.github.io/";
var OPS = "https://citywidelv.github.io/cw-ops-desk/";
var VS = "https://citywidelv.github.io/cw-vendor-hub/";
var SHEET = "https://docs.google.com/spreadsheets/d/1kHRyeQzDsi-bnfE5YpD_KPV17GeD5aJ_5vrDQGU_s-0/edit";
var LOGO = "https://emailer.emfluence.com/clients/citywide/uploadedfiles/signature_logo.png";

/* Asana. The Business Operations Management team; projects are fetched live from the
   Apps Script (kind vd_bom_asana, team) and fall back to this list. */
var ASANA_TEAM = "1211434492126259";
var ASANA_WS = "13140959242873";
var ASANA_TEAM_URL = "https://app.asana.com/0/" + ASANA_TEAM + "/overview";
var ASANA_PROJECTS = [
  { gid:"1211554681536533", name:"IC Background Checks", group:"Background Checks", icon:"shield" },
  { gid:"1211434492126262", name:"LV Onboarding - JS ICs", group:"Onboarding", icon:"clip" },
  { gid:"1211502025994506", name:"LV Onboarding - OS ICs", group:"Onboarding", icon:"clip" },
  { gid:"1211502025994509", name:"NNV Onboarding - JS ICs", group:"Onboarding", icon:"clip" },
  { gid:"1211502025994512", name:"NNV Onboarding - OS ICs", group:"Onboarding", icon:"clip" },
  { gid:"1212873397063867", name:"NNV IC Transfers", group:"Onboarding", icon:"route" },
  { gid:"1211502025570262", name:"Exhibit A Requests", group:"Requests", icon:"sheet" },
  { gid:"1211522761691094", name:"Office Management", group:"Office", icon:"home" }
];
function asanaUrl(gid){ return "https://app.asana.com/1/" + ASANA_WS + "/project/" + gid; }

/* Asana forms (form.asana.com allows embedding; app.asana.com does not) */
var FORMS = {
  bgcheck: "https://form.asana.com/?k=FRCnQmbTGjAVPieFt4bnWQ&d=" + ASANA_WS,
  exhibitA: "https://form.asana.com/?k=Ch8IqpDXjkcNqdqvjV5-oA&d=" + ASANA_WS,
  walkthrough: "https://form.asana.com/?k=lnuBJNlGrHJNAeW8QWbXzA&d=" + ASANA_WS,
  packetLvJs: "https://form.asana.com/?k=RdHag7PTO7L2imrLsWCCVQ&d=" + ASANA_WS,
  packetLvOs: "https://form.asana.com/?k=uX5QbBSefsA-Gq34EmjeJA&d=" + ASANA_WS,
  packetNnvJs: "https://form.asana.com/?k=fF2mqfxy9BFvXbF-pnLYJA&d=" + ASANA_WS,
  packetNnvOs: "https://form.asana.com/?k=J4_mbPCYb_6P2MesPMxUPw&d=" + ASANA_WS
};

var ICONS = {
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  clip:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12l2 2 4-4"/>',
  sheet:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  route:'<path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z"/><path d="M9 7v13M15 4v13"/>',
  home:'<path d="M3 12l9-8 9 8M5 10v10h14V10"/>',
  board:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8M8 17h5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ext:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  work:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  asana:'<circle cx="12" cy="7" r="3.2"/><circle cx="6.5" cy="16" r="3.2"/><circle cx="17.5" cy="16" r="3.2"/>'
};
function icon(k, size){
  size = size || 15;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[k] || ICONS.home) + '</svg>';
}
function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* ---------- nav tree. Add a tool here and it shows on every BOM page. ---------- */
var MENU = [
  { label:"Background Checks", icon:"shield", items:[
    {label:"Review & Record Results", href:"background-checks.html", tag:"Hub"},
    {label:"Add a Person", href:"background-checks.html#add", tag:"Hub"},
    {ghead:"Requests"},
    {label:"Request or Upload a Check (form)", href:FORMS.bgcheck, tag:"Asana"},
    {label:"IC Background Checks project", href:asanaUrl("1211554681536533"), tag:"Asana"},
    {label:"Send Vendor Notices", href:OPS + "bc-notices.html", tag:"Ops Hub"},
    {ghead:"Records"},
    {label:"Background Checks on File (Sheet)", href:SHEET, tag:"Sheet"},
    {label:"Verified First", href:"https://app.verifiedfirst.com/", tag:"Site"}
  ]},
  { label:"Onboarding", icon:"clip", items:[
    {ghead:"Las Vegas"},
    {label:"LV Onboarding - Janitorial ICs", href:asanaUrl("1211434492126262"), tag:"Asana"},
    {label:"LV Onboarding - Other Services ICs", href:asanaUrl("1211502025994506"), tag:"Asana"},
    {ghead:"Northern Nevada"},
    {label:"NNV Onboarding - Janitorial ICs", href:asanaUrl("1211502025994509"), tag:"Asana"},
    {label:"NNV Onboarding - Other Services ICs", href:asanaUrl("1211502025994512"), tag:"Asana"},
    {label:"NNV IC Transfers", href:asanaUrl("1212873397063867"), tag:"Asana"},
    {ghead:"Vendor Packets"},
    {label:"Request a Packet (LV Janitorial)", href:FORMS.packetLvJs, tag:"Form"},
    {label:"Request a Packet (LV Other Services)", href:FORMS.packetLvOs, tag:"Form"},
    {label:"Request a Packet (NNV Janitorial)", href:FORMS.packetNnvJs, tag:"Form"},
    {label:"Request a Packet (NNV Other Services)", href:FORMS.packetNnvOs, tag:"Form"},
    {ghead:"Directory"},
    {label:"Add a Vendor", href:OPS + "vendor-add.html", tag:"Ops Hub"},
    {label:"Active Vendors (Las Vegas)", href:OPS + "vendors.html#/lv/janitorial", tag:"Ops Hub"},
    {label:"Active Vendors (Northern Nevada)", href:OPS + "vendors.html#/nnv/janitorial", tag:"Ops Hub"}
  ]},
  { label:"Asana Boards", icon:"asana", items:[
    {label:"All BOM boards, live", href:"asana.html", tag:"Hub"},
    {label:"Business Ops team in Asana", href:ASANA_TEAM_URL, tag:"Asana"},
    {ghead:"Requests"},
    {label:"Exhibit A Requests", href:asanaUrl("1211502025570262"), tag:"Asana"},
    {label:"Request an Exhibit A (form)", href:FORMS.exhibitA, tag:"Form"},
    {label:"Request a Walkthrough Email (form)", href:FORMS.walkthrough, tag:"Form"},
    {ghead:"Office"},
    {label:"Office Management board", href:asanaUrl("1211522761691094"), tag:"Asana"}
  ]},
  { label:"Team & Admin", icon:"home", items:[
    {label:"Nevada Team Portal", href:PORTAL},
    {label:"Ops Hub", href:OPS},
    {label:"Vendor Hub", href:VS},
    {ghead:"Admin"},
    {label:"ADP TotalSource", href:"https://workforcenow.adp.com/"},
    {label:"CW Sales CRM", href:"https://gocitywide.crm.dynamics.com/main.aspx"},
    {label:"Employee Uniforms", href:OPS + "uniforms.html", tag:"Ops Hub"},
    {label:"Order CW Merch", href:"https://cwlv.printful.me/"}
  ]}
];

function isExternal(href){ return /^https?:/.test(href) && href.indexOf("citywidelv.github.io") < 0; }
function menuLink(it){
  var tgt = isExternal(it.href) ? ' target="_blank" rel="noopener"' : '';
  return '<a href="' + esc(it.href) + '"' + tgt + '>' + esc(it.label) + (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : '') + '</a>';
}
function renderHeader(page){
  var h = document.getElementById("bomhead");
  if(!h) return;
  var nav = "";
  MENU.forEach(function(m, mi){
    var here = (page === "bc" && mi === 0) || (page === "asana" && mi === 2);
    var items = "";
    m.items.forEach(function(it){ items += it.ghead ? '<div class="ghead">' + esc(it.ghead) + '</div>' : menuLink(it); });
    nav += '<div class="nitem"><button class="nbtn' + (here ? ' here' : '') + '" data-dd="' + mi + '">' + icon(m.icon, 14) + esc(m.label) +
      ' <span class="caret">&#9660;</span></button><div class="nmenu" id="dd-' + mi + '">' + items + '</div></div>';
  });
  h.innerHTML =
    '<div class="bar"><a href="index.html" style="display:flex;align-items:center"><img src="' + LOGO + '" alt="City Wide Facility Solutions"></a>' +
    '<span class="t"><b>BOM</b> Hub</span><span class="sp"></span>' +
    '<span class="badge">Business Operations</span>' +
    '<a class="out" href="index.html">Hub home</a>' +
    '<a class="out" href="' + PORTAL + '">&larr; Team Portal</a>' +
    '<a class="out" id="bomsignout" href="#">Sign out</a></div>' +
    '<nav class="mainnav"><div class="nav-in" id="mainnav"><a class="nbtn" href="index.html">' + icon("board", 14) + 'Home</a>' + nav + '</div></nav>';
  var host = document.getElementById("mainnav");
  host.onclick = function(e){
    var btn = e.target.closest ? e.target.closest(".nbtn[data-dd]") : null;
    if(!btn) return;
    var dd = document.getElementById("dd-" + btn.getAttribute("data-dd"));
    var wasOpen = dd.classList.contains("show");
    closeMenus();
    if(!wasOpen){
      dd.classList.add("show"); btn.classList.add("open");
      if(window.matchMedia && matchMedia("(max-width:820px)").matches){
        var r = btn.getBoundingClientRect(); dd.style.top = Math.round(r.bottom + 6) + "px";
      } else dd.style.top = "";
    }
  };
  document.getElementById("bomsignout").addEventListener("click", function(e){
    e.preventDefault();
    try{ localStorage.removeItem(KEY); }catch(x){}
    location.reload();
  });
  document.addEventListener("click", function(e){
    if(e.target && e.target.closest && e.target.closest(".nitem")) return;
    closeMenus();
  });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeMenus(); });
  window.addEventListener("resize", closeMenus);
}
function closeMenus(){
  document.querySelectorAll(".nmenu.show").forEach(function(d){ d.classList.remove("show"); d.style.top = ""; });
  document.querySelectorAll(".nbtn.open").forEach(function(b){ b.classList.remove("open"); });
}

/* ---------- webhook ---------- */
var PASS = "";
function api(payload){
  payload = payload || {};
  payload.passcode = PASS;
  return fetch(WEBHOOK, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify(payload) })
    .then(function(r){ return r.json(); });
}

/* ---------- toast ---------- */
var toastTimer = null;
function toast(msg, kind){
  var t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = "toast"; }, kind === "err" ? 6000 : 3200);
}

/* ---------- gate ---------- */
function gateHtml(){
  return '<div class="box"><img src="' + LOGO + '" alt="City Wide Facility Solutions">' +
    '<div class="k">Business Operations Management</div><h1>BOM Hub</h1>' +
    '<p>Internal team access. Enter the BOM Hub passcode to continue.</p>' +
    '<input type="password" id="pc" placeholder="Passcode" autocomplete="current-password" autofocus>' +
    '<button id="enter">Enter</button><div class="err" id="gerr"></div>' +
    '<div class="note">Ask TJ if you do not have the passcode. The Ops Hub team passcode also works.</div>' +
    '<a class="backlink" href="' + PORTAL + '">&larr; Back to the Nevada Team Portal</a></div>';
}
function tryPass(pass, isAuto, onOk){
  var btn = document.getElementById("enter"), err = document.getElementById("gerr");
  err.textContent = "";
  if(!pass){ err.textContent = "Enter the passcode."; return; }
  btn.disabled = true; btn.textContent = "Checking...";
  fetch(WEBHOOK, { method:"POST", headers:{"Content-Type":"text/plain"}, body: JSON.stringify({ kind:"vd_bom_auth", passcode: pass }) })
  .then(function(r){ return r.json(); })
  .then(function(r){
    btn.disabled = false; btn.textContent = "Enter";
    if(r && r.ok){
      PASS = pass;
      try{ localStorage.setItem(KEY, pass); }catch(e){}
      document.getElementById("gate").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      onOk(r);
    } else {
      if(isAuto){ try{ localStorage.removeItem(KEY); }catch(e){} }
      else err.textContent = (r && r.error) ? r.error : "That passcode is not right.";
      if(isAuto && isAuto.next) isAuto.next();
    }
  })
  .catch(function(){
    btn.disabled = false; btn.textContent = "Enter";
    err.textContent = "Could not reach the server. Check your connection and try again.";
  });
}

function init(opts){
  opts = opts || {};
  var gate = document.getElementById("gate");
  gate.innerHTML = gateHtml();
  renderHeader(opts.page);
  function go(r){ if(opts.onReady) opts.onReady(r); }
  document.getElementById("enter").addEventListener("click", function(){ tryPass(document.getElementById("pc").value.trim(), false, go); });
  document.getElementById("pc").addEventListener("keydown", function(e){ if(e.key === "Enter") tryPass(this.value.trim(), false, go); });
  // Saved BOM passcode first, then the Ops Hub team passcode cached on this same origin.
  var saved = "", ops = "";
  try{ saved = localStorage.getItem(KEY) || ""; ops = localStorage.getItem(OPSKEY) || ""; }catch(e){}
  if(saved) tryPass(saved, { next: function(){ if(ops) tryPass(ops, {}, go); } }, go);
  else if(ops) tryPass(ops, {}, go);
}

function who(){
  var n = "";
  try{ n = localStorage.getItem(NAMEKEY) || ""; }catch(e){}
  return n;
}
function setWho(n){ try{ localStorage.setItem(NAMEKEY, n); }catch(e){} }

function fmtDate(s){
  if(!s) return "";
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if(!m) return String(s);
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
}
function ago(iso){
  if(!iso) return "";
  var d = (Date.now() - new Date(iso).getTime()) / 1000;
  if(d < 90) return "just now";
  if(d < 3600) return Math.round(d / 60) + " min ago";
  if(d < 86400) return Math.round(d / 3600) + " hr ago";
  return Math.round(d / 86400) + " days ago";
}

window.BOM = { init:init, api:api, esc:esc, icon:icon, toast:toast, who:who, setWho:setWho, fmtDate:fmtDate, ago:ago,
  MENU:MENU, ASANA_PROJECTS:ASANA_PROJECTS, ASANA_TEAM:ASANA_TEAM, ASANA_TEAM_URL:ASANA_TEAM_URL, asanaUrl:asanaUrl,
  FORMS:FORMS, OPS:OPS, VS:VS, PORTAL:PORTAL, SHEET:SHEET, LOGO:LOGO, isExternal:isExternal,
  pass:function(){ return PASS; } };
})();
