/* CW Account Changes shared script. Build 2026-09-05d (chat thread on every entry with a Chat column and needs-a-reply badge; section tables fit the page width, no sideways scrolling; c: dropdown-style comboboxes with caret and arrow keys; pick-lists on free-text fields from history).
   Section metadata, field types, the entry form builder, the combobox, and the
   display helpers used by act-entry.html (Ops Hub), act-document.html,
   accounting-queue.html and accounts.html (BOM Hub). Loaded from
   https://citywidelv.github.io/cw-bom-hub/act-shared.js on every page.
   Data lives in the "CW Account Changes" Google Sheet through ActLedger.gs
   (kinds vd_act_*), reached through the CW Solicitations Apps Script. */
(function(){
"use strict";
var WEBHOOK = "https://script.google.com/macros/s/AKfycbzfNnrpidCbWB1DeUNgXvRhDFMQgApfpn-3C9GU45wMEHcJpWFl8ZQVo6PUBSRfEVfRdg/exec";
var OPS = "https://citywidelv.github.io/cw-ops-desk/";
var BOMURL = "https://citywidelv.github.io/cw-bom-hub/";
var REGIONS = ["Las Vegas", "Northern Nevada"];
var REGION_KEY = { "Las Vegas": "lv", "Northern Nevada": "nnv" };
var KEY_REGION = { lv: "Las Vegas", nnv: "Northern Nevada" };
var FIXED_ICS = ["In House", "Unassigned"];

/* Field types: account | ic | fsm | date | money | number | int | pct | yesno | ctype |
   reason | month | text | notes | item. Everything not listed here is text. */
var FIELD = {
  "Account": "account", "IC": "ic", "Prior IC": "ic", "New IC": "ic", "Move Pay To": "ic", "FSM": "fsm",
  "Start Date": "date", "Effective Date": "date", "Last Day Prior": "date", "First Day New": "date", "End Date": "date", "Date": "date",
  "Hold Start Date": "date", "Hold End Date": "date",
  "CW Bill Rate": "money", "IC Pay Rate": "money", "Old CW Bill Rate": "money", "New CW Bill Rate": "money", "Old IC Pay": "money", "New IC Pay": "money",
  "IC Daily Rate": "money", "CW Daily Rate": "money", "IC Total": "money", "CW Total": "money", "Client Credit": "money", "IC Deduction": "money",
  "Amount": "money", "Project Total": "money", "Deposit": "money", "New IC Amount": "money",
  "Days": "int", "Deposit %": "pct", "Margin %": "pct",
  "Prorate?": "yesno", "Refund PB?": "yesno", "Hold IC Pay This Month?": "yesno", "Pay IC Advance?": "yesno",
  "Contract Type": "ctype", "Reason": "reason", "Month Affected": "month",
  "Notes": "notes", "Description or Reason": "notes", "Reason Detail": "notes", "Insurance Notes": "notes", "Project Type": "text",
  "EC Number": "text", "EC (If Applicable)": "text", "Item": "item",
  "Last Month Count": "number", "# Sold": "number", "# Comped/Gifted": "number", "# Received": "number", "# Expected": "number", "Count This Month": "number", "Variance": "number"
};
var HELP = {
  "Prorate?": "Yes when the first month is billed for part of the month only.",
  "Refund PB?": "Refund the performance bond to the IC?",
  "Hold IC Pay This Month?": "Yes = accounting holds this IC's pay for the month (10-month school schedules and the like).",
  "EC (If Applicable)": "Extra charge or work order number, if the change ties to one.",
  "EC Number": "Extra charge number from CRM.",
  "Month Affected": "The ledger month this change applies to.",
  "Reason Detail": "Required when Reason is Other.",
  "Move Pay To": "The IC who should receive the pay.",
  "New IC Amount": "Amount to pay the IC named in Move Pay To.",
  "Deposit %": "Share of the project total collected up front.",
  "Margin %": "Margin on the project.",
  "Days": "Days worked this month. IC Total and CW Total calculate from the daily rates; you can overwrite them."
};
/* Sections, in Excel order. Same names and columns as ActLedger.gs. */
var SECTIONS = [
  { key: "new_accounts", name: "New Accounts", doc: "ACT", entry: true, blurb: "A new contract or a new service line on an account.",
    cols: ["Account", "IC", "FSM", "Start Date", "CW Bill Rate", "IC Pay Rate", "Contract Type", "Prorate?", "Notes"] },
  { key: "billing_changes", name: "Billing Changes", doc: "ACT", entry: true, blurb: "A price or IC pay change on an existing account.",
    cols: ["Account", "IC", "FSM", "Effective Date", "Old CW Bill Rate", "New CW Bill Rate", "Old IC Pay", "New IC Pay", "Contract Type", "Notes"] },
  { key: "ic_change_outs", name: "IC Change Outs", doc: "ACT", entry: true, blurb: "One IC leaves an account and another takes it.",
    cols: ["Account", "Prior IC", "New IC", "Last Day Prior", "First Day New", "FSM", "Refund PB?", "Notes"] },
  { key: "lost_accounts", name: "Lost Accounts", doc: "ACT", entry: true, blurb: "An account cancelled or ended.",
    cols: ["Account", "IC", "FSM", "End Date", "Refund PB?", "Description or Reason"] },
  { key: "floating_accounts", name: "Floating Accounts", doc: "ACT", entry: true, blurb: "Day-rate work billed by the day (security, temp cleans, the office).",
    cols: ["Account", "IC", "FSM", "IC Daily Rate", "CW Daily Rate", "Days", "IC Total", "CW Total", "Notes"] },
  { key: "account_credits", name: "Account Credits", doc: "ACT", entry: true, blurb: "A credit to the client and the matching IC deduction.",
    cols: ["Account", "IC", "FSM", "Date", "Client Credit", "IC Deduction", "Notes"] },
  { key: "miscellaneous", name: "Miscellaneous", doc: "ACT", entry: true, blurb: "One-off amounts, extra charges, anything that fits nowhere else.",
    cols: ["Account", "IC", "FSM", "EC Number", "Amount", "Notes"] },
  { key: "variable_term", name: "Variable Term IC Payment Schedules", doc: "ACT", entry: true, blurb: "ICs on a schedule that is not 12 months (schools). Say whether pay is held this month.",
    cols: ["Account", "IC", "Notes", "Hold IC Pay This Month?"] },
  { key: "project_deposits", name: "Project Deposits", doc: "ACT", entry: true, blurb: "A project with a deposit collected up front.",
    cols: ["Account", "IC", "FSM", "Project Type", "Start Date", "Project Total", "Deposit %", "Deposit", "Margin %", "Pay IC Advance?"] },
  { key: "office_inventory", name: "Office Inventory", doc: "ACT", entry: false, nocheck: true, blurb: "Monthly office supply counts (Las Vegas). Imported history; no entry form.",
    cols: ["Item", "Last Month Count", "# Sold", "# Comped/Gifted", "# Received", "# Expected", "Count This Month", "Variance", "Notes"] },
  { key: "account_holds", name: "Account Holds", doc: "ACT", entry: false, legacy: true, blurb: "Service holds from the 2024-2025 layout. History only.",
    cols: ["Account", "IC", "FSM", "Hold Start Date", "Hold End Date", "Reason"] },
  { key: "ledger_changes", name: "Ledger Changes", doc: "Ledger", entry: true, blurb: "A correction to what an IC is paid on the ledger.",
    cols: ["Account", "IC", "FSM", "Amount", "EC (If Applicable)", "Reason", "Reason Detail", "Move Pay To", "New IC Amount", "Month Affected", "Insurance Notes"] }
];
function section(k){
  k = String(k || "").toLowerCase();
  for(var i = 0; i < SECTIONS.length; i++) if(SECTIONS[i].key === k || SECTIONS[i].name.toLowerCase() === k) return SECTIONS[i];
  return null;
}

function esc(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function $(id){ return document.getElementById(id); }
var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function monthKey(d){ d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function monthName(k){ var m = /^(\d{4})-(\d{2})$/.exec(String(k || "")); return m ? MONTHS[Number(m[2]) - 1] + " " + m[1] : String(k || ""); }
function monthKeyOf(name){
  var m = /^(\d{4})-(\d{2})$/.exec(String(name || "")); if(m) return m[0];
  var p = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(name || "").trim()); if(!p) return "";
  var i = MONTHS.map(function(x){ return x.toLowerCase(); }).indexOf(p[1].toLowerCase());
  return i < 0 ? "" : p[2] + "-" + String(i + 1).padStart(2, "0");
}
function shiftMonth(k, n){ var m = /^(\d{4})-(\d{2})$/.exec(k); var d = new Date(Number(m[1]), Number(m[2]) - 1 + n, 1); return monthKey(d); }
function monthRange(fromKey, toKey){ var out = [], k = fromKey; while(k <= toKey){ out.push(k); k = shiftMonth(k, 1); if(out.length > 240) break; } return out; }

function money(v){
  if(v === "" || v === null || v === undefined) return "";
  var n = Number(v); if(isNaN(n)) return String(v);
  var neg = n < 0; n = Math.abs(n);
  var s = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "-$" : "$") + s;
}
function pct(v){ if(v === "" || v == null) return ""; var n = Number(v); if(isNaN(n)) return String(v); if(n > 1) return n + "%"; return Math.round(n * 10000) / 100 + "%"; }
function dateOut(v){
  if(v === "" || v == null) return "";
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if(!m) return String(v);   /* history typed as text ("8.1.2026") stays as typed */
  return Number(m[2]) + "/" + Number(m[3]) + "/" + m[1];
}
function display(h, v){
  var t = FIELD[h] || "text";
  if(v === "" || v == null) return "";
  if(t === "money") return money(v);
  if(t === "pct") return pct(v);
  if(t === "date") return dateOut(v);
  if(t === "yesno") return String(v);
  return String(v);
}
function numClass(h){ var t = FIELD[h]; return (t === "money" || t === "number" || t === "int" || t === "pct") ? " num" : (t === "date" ? " dt" : ""); }

/* ---------- context (lists, accounts, vendors) ---------- */
var CTX = null;
function setContext(c){ CTX = c; }
function accountsFor(region){
  return (CTX && CTX.accounts || []).filter(function(a){ return a.region === region; })
    .sort(function(a, b){ return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
}
var LIVE_STATUS = { "Active": 0, "Waiting for Account": 1, "In Progress": 2 };
function vendorsFor(region){
  /* Live vendors (Active, Waiting for Account, In Progress) list first; prospects and inactive after. */
  var list = (CTX && CTX.vendors || []).filter(function(v){ return v.region === region || v.region === "Both"; });
  list.sort(function(a, b){
    var ra = LIVE_STATUS[a.status] === undefined ? 9 : LIVE_STATUS[a.status], rb = LIVE_STATUS[b.status] === undefined ? 9 : LIVE_STATUS[b.status];
    if(ra !== rb) return ra - rb;
    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  });
  return list;
}
function fsmsFor(region){ return (CTX && CTX.lists && CTX.lists.fsms && CTX.lists.fsms[region]) || []; }
function ctypesFor(region){ return (CTX && CTX.lists && CTX.lists.contract_types && CTX.lists.contract_types[region]) || []; }
function reasons(){ return (CTX && CTX.lists && CTX.lists.ledger_reasons) || []; }
function suggestFor(sectionKey, h){ var s = CTX && CTX.suggest; if(!s) return []; return s[sectionKey + "|" + h] || []; }
function reasonNeedsIc(r){ var x = reasons().filter(function(o){ return o.reason === r; })[0]; return !!(x && x.needs_new_ic); }

/* ---------- combobox: a text box with a filtered list and an exact-match rule ---------- */
/* opts: {id, options:[{value,label,sub,tag}], value, placeholder, allowFree, onAdd(label), onRename(value), onChange(value)} */
function combo(host, opts){
  var input = document.createElement("input");
  input.type = "text"; input.id = opts.id; input.autocomplete = "off"; input.placeholder = opts.placeholder || "Type to search";
  input.className = "cbx-in";
  var list = document.createElement("div"); list.className = "cbx-list hidden";
  var wrap = document.createElement("div"); wrap.className = "cbx";
  var caret = document.createElement("button"); caret.type = "button"; caret.className = "cbx-caret"; caret.title = "Show the list"; caret.tabIndex = -1;
  caret.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  wrap.appendChild(input); wrap.appendChild(caret); wrap.appendChild(list);
  var tools = document.createElement("div"); tools.className = "cbx-tools";
  if(opts.onAdd){ var b = document.createElement("button"); b.type = "button"; b.className = "mini"; b.textContent = opts.addLabel || "+ Add new"; b.onclick = function(){ opts.onAdd(input.value.trim()); }; tools.appendChild(b); }
  if(opts.onRename){ var r = document.createElement("button"); r.type = "button"; r.className = "mini"; r.textContent = "Rename"; r.onclick = function(){ if(state.value) opts.onRename(state.value); else alert("Pick the one to rename first."); }; tools.appendChild(r); }
  if(tools.childNodes.length) wrap.appendChild(tools);
  host.innerHTML = ""; host.appendChild(wrap);
  var state = { value: "", options: opts.options || [], hits: [], sel: -1 };
  function norm(s){ return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function labelOf(v){ var o = state.options.filter(function(x){ return x.value === v; })[0]; return o ? o.label : v; }
  function setValue(v, silent){
    state.value = v || "";
    input.value = state.value ? labelOf(state.value) : "";
    input.classList.toggle("ok", !!state.value);
    input.classList.remove("bad");
    if(!silent && opts.onChange) opts.onChange(state.value);
  }
  function render(){
    var q = norm(input.value);
    var words = q ? q.split(" ") : [];
    var hits = state.options.filter(function(o){
      if(!q) return true;
      var hay = norm(o.label + " " + (o.sub || "") + " " + (o.alt || ""));
      return words.every(function(w){ return hay.indexOf(w) >= 0; });
    });
    var starts = hits.filter(function(o){ return norm(o.label).indexOf(q) === 0; });
    var rest = hits.filter(function(o){ return norm(o.label).indexOf(q) !== 0; });
    hits = starts.concat(rest).slice(0, 80);
    state.hits = hits; state.sel = hits.length ? 0 : -1;
    if(!hits.length){
      list.innerHTML = '<div class="cbx-none">No match' + (opts.onAdd ? '. Use <b>' + esc(opts.addLabel || "+ Add new") + '</b> to add "' + esc(input.value.trim()) + '".' : '.') + '</div>';
    } else {
      list.innerHTML = hits.map(function(o, i){
        return '<div class="cbx-opt' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '"><span>' + esc(o.label) + '</span>' + (o.tag ? '<em>' + esc(o.tag) + '</em>' : '') + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div>';
      }).join("") + (state.options.length > hits.length && q ? '' : (state.options.length > 80 && !q ? '<div class="cbx-none">Showing the first 80 of ' + state.options.length + '. Type to narrow the list.</div>' : ''));
      list.querySelectorAll(".cbx-opt").forEach(function(el, i){ el.onmousedown = function(e){ e.preventDefault(); setValue(hits[i].value); close(); }; el.onmouseenter = function(){ mark(i); }; });
    }
    list.classList.remove("hidden"); wrap.classList.add("open");
  }
  function mark(i){
    if(!state.hits.length) return;
    state.sel = Math.max(0, Math.min(state.hits.length - 1, i));
    list.querySelectorAll(".cbx-opt").forEach(function(el, j){ el.classList.toggle("sel", j === state.sel); });
    var el = list.querySelector(".cbx-opt.sel"); if(el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
  function close(){ list.classList.add("hidden"); wrap.classList.remove("open"); }
  function isOpen(){ return !list.classList.contains("hidden"); }
  input.addEventListener("focus", function(){ if(!state.value) render(); else { input.select(); render(); } });
  input.addEventListener("click", function(){ if(!isOpen()) render(); });
  caret.addEventListener("mousedown", function(e){ e.preventDefault(); if(isOpen()){ close(); } else { if(state.value) input.select(); input.focus(); input.value = ""; render(); if(state.value) input.value = labelOf(state.value); } });
  input.addEventListener("input", function(){ state.value = ""; input.classList.remove("ok"); render(); if(opts.onChange) opts.onChange(""); });
  input.addEventListener("blur", function(){
    setTimeout(function(){
      close();
      if(state.value) return;
      var t = input.value.trim();
      if(!t) return;
      /* exact label match wins; otherwise the field is not set (keeps typed text visible, marked) */
      var exact = state.options.filter(function(o){ return norm(o.label) === norm(t); })[0];
      if(exact){ setValue(exact.value); return; }
      if(opts.allowFree){ state.value = t; input.classList.add("ok"); if(opts.onChange) opts.onChange(t); return; }
      input.classList.add("bad");
    }, 120);
  });
  input.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ close(); return; }
    if(e.key === "ArrowDown"){ e.preventDefault(); if(!isOpen()) render(); else mark(state.sel + 1); return; }
    if(e.key === "ArrowUp"){ e.preventDefault(); if(isOpen()) mark(state.sel - 1); return; }
    if(e.key === "Enter" || e.key === "Tab"){
      if(isOpen() && state.sel >= 0 && state.hits[state.sel]){ if(e.key === "Enter") e.preventDefault(); setValue(state.hits[state.sel].value); close(); }
      return;
    }
  });
  var api = {
    get: function(){ return state.value; },
    set: function(v){ setValue(v, true); },
    setOptions: function(o){ state.options = o || []; },
    typed: function(){ return input.value.trim(); },
    input: input,
    focus: function(){ input.focus(); }
  };
  if(opts.value) setValue(opts.value, true);
  return api;
}

/* ---------- the entry form ---------- */
/* Builds the fields of one section into host. ctx = {region}. values = {header: value}.
   Returns {read(), valid(), focusFirst(), setRegion(), combos}. hooks = {onAddAccount, onRenameAccount, onAddVendor, onRenameVendor}. */
function buildForm(host, sec, region, values, hooks){
  values = values || {}; hooks = hooks || {};
  var combos = {};
  var html = '<div class="frm-grid">';
  sec.cols.forEach(function(h){
    var t = FIELD[h] || "text";
    var wide = (t === "notes") ? " wide" : "";
    var req = (h === "Account" || (sec.key === "ledger_changes" && h === "Reason")) ? ' <span class="req">required</span>' : '';
    var help = HELP[h] ? '<small class="help">' + esc(HELP[h]) + '</small>' : '';
    html += '<div class="fld' + wide + '" data-h="' + esc(h) + '"><label for="f_' + esc(h) + '">' + esc(h) + req + '</label><div class="ctl" id="c_' + esc(h) + '"></div>' + help + '</div>';
  });
  html += '</div>';
  host.innerHTML = html;
  function ctl(h){ return host.querySelector('[id="c_' + h + '"]'); }
  function setInput(h, el){ el.id = "f_" + h; ctl(h).innerHTML = ""; ctl(h).appendChild(el); return el; }
  var fields = {};
  sec.cols.forEach(function(h){
    var t = FIELD[h] || "text";
    var v = values[h] === undefined || values[h] === null ? "" : values[h];
    var el;
    if(t === "account"){
      combos[h] = combo(ctl(h), { id: "f_" + h, placeholder: "Start typing the account name",
        options: accountsFor(region).map(function(a){ return { value: a.name, label: a.name, sub: (a.status || "") + (a.verified ? "" : " · not yet verified") + (a.fsm ? " · " + a.fsm : ""), tag: a.status === "Needs review" ? "review" : "" }; }),
        value: v, allowFree: !!values.__history,
        onAdd: hooks.onAddAccount ? function(typed){ hooks.onAddAccount(typed, combos[h]); } : null, addLabel: "+ Add account",
        onRename: hooks.onRenameAccount ? function(cur){ hooks.onRenameAccount(cur, combos[h]); } : null });
      fields[h] = function(){ return combos[h].get(); };
    } else if(t === "ic"){
      var opts = FIXED_ICS.map(function(x){ return { value: x, label: x, tag: "fixed" }; }).concat(
        vendorsFor(region).map(function(x){ return { value: x.name, label: x.name, sub: (x.status || "") + (x.region === "Both" ? " · both markets" : ""), alt: x.legal || "" }; }));
      combos[h] = combo(ctl(h), { id: "f_" + h, placeholder: "Start typing the vendor name", options: opts, value: v, allowFree: !!values.__history,
        onAdd: hooks.onAddVendor ? function(typed){ hooks.onAddVendor(typed, combos[h]); } : null, addLabel: "+ Add vendor",
        onRename: hooks.onRenameVendor ? function(cur){ hooks.onRenameVendor(cur, combos[h]); } : null,
        onChange: function(val){ if(h === "Reason") return; } });
      fields[h] = function(){ return combos[h].get(); };
    } else if(t === "fsm" || t === "ctype" || t === "yesno" || t === "reason" || t === "month"){
      el = document.createElement("select");
      var list = t === "fsm" ? fsmsFor(region) : t === "ctype" ? ctypesFor(region) : t === "yesno" ? ["Yes", "No"] :
                 t === "reason" ? reasons().map(function(r){ return r.reason; }) : monthRange(shiftMonth(monthKey(), -13), shiftMonth(monthKey(), 2)).reverse().map(monthName);
      var cur = String(v);
      var hasCur = !cur || list.indexOf(cur) >= 0;
      var o = '<option value="">' + (t === "yesno" ? "" : "Pick one") + '</option>';
      if(!hasCur) o += '<option value="' + esc(cur) + '">' + esc(cur) + ' (as typed in Excel)</option>';
      list.forEach(function(x){ o += '<option value="' + esc(x) + '"' + (x === cur ? " selected" : "") + '>' + esc(x) + '</option>'; });
      el.innerHTML = o; if(!hasCur) el.value = cur;
      setInput(h, el);
      fields[h] = (function(e){ return function(){ return e.value; }; })(el);
    } else if(t === "date"){
      el = document.createElement("input");
      var iso = /^\d{4}-\d{2}-\d{2}$/.test(String(v));
      if(iso || v === ""){ el.type = "date"; el.value = v; }
      else { el.type = "text"; el.value = v; el.title = "Typed as text in Excel. Clear it to pick a real date."; el.className = "astyped"; }
      setInput(h, el);
      fields[h] = (function(e){ return function(){ return e.value; }; })(el);
      el.addEventListener("input", function(){ if(el.type === "text" && !el.value){ el.type = "date"; el.classList.remove("astyped"); } });
    } else if(t === "money" || t === "number" || t === "int" || t === "pct"){
      el = document.createElement("input"); el.type = "number"; el.step = t === "int" ? "1" : "0.01"; el.inputMode = "decimal";
      if(t === "pct"){ el.step = "0.01"; el.value = (v === "" ? "" : (Number(v) <= 1 ? Math.round(Number(v) * 10000) / 100 : v)); el.placeholder = "%"; }
      else el.value = (v === "" || isNaN(Number(v))) ? "" : v;
      if(v !== "" && isNaN(Number(v)) && t !== "pct"){ el.type = "text"; el.value = v; el.className = "astyped"; el.title = "Typed as text in Excel."; }
      setInput(h, el);
      fields[h] = (function(e, tt){ return function(){ if(e.value === "") return ""; if(tt === "pct"){ var n = Number(e.value); return isNaN(n) ? e.value : (n > 1 ? n / 100 : n); } return e.type === "number" ? Number(e.value) : e.value; }; })(el, t);
    } else if(t === "notes" || t === "text"){
      el = t === "notes" ? document.createElement("textarea") : document.createElement("input");
      if(t === "notes") el.rows = 2; else el.type = "text";
      el.value = v; setInput(h, el);
      var sug = suggestFor(sec.key, h);
      if(sug.length){
        /* a pick-list of what the team usually types here; typing still works */
        var pick = document.createElement("select"); pick.className = "pick"; pick.id = "p_" + h;
        pick.innerHTML = '<option value="">Pick a usual entry, or type below</option>' + sug.map(function(s){ return '<option value="' + esc(s) + '"' + (s === String(v) ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join("") ;
        (function(sel, box){ sel.addEventListener("change", function(){ if(sel.value){ box.value = sel.value; box.dispatchEvent(new Event("input")); } }); box.addEventListener("input", function(){ if(sel.value && sel.value !== box.value) sel.value = ""; }); })(pick, el);
        ctl(h).insertBefore(pick, el);
      }
      fields[h] = (function(e){ return function(){ return e.value.trim(); }; })(el);
    }
  });
  /* section behaviours */
  function fieldEl(h){ return host.querySelector('[id="f_' + h + '"]'); }
  function fldBox(h){ return host.querySelector('.fld[data-h="' + h.replace(/"/g, '\\"') + '"]'); }
  if(sec.key === "floating_accounts"){
    var calc = function(){
      var d = Number(fieldEl("Days").value || 0);
      var ir = fieldEl("IC Daily Rate").value, cr = fieldEl("CW Daily Rate").value;
      if(ir !== "" && !fieldEl("IC Total").dataset.manual) fieldEl("IC Total").value = Math.round(Number(ir) * d * 100) / 100;
      if(cr !== "" && !fieldEl("CW Total").dataset.manual) fieldEl("CW Total").value = Math.round(Number(cr) * d * 100) / 100;
    };
    ["Days", "IC Daily Rate", "CW Daily Rate"].forEach(function(h){ fieldEl(h).addEventListener("input", calc); });
    ["IC Total", "CW Total"].forEach(function(h){ fieldEl(h).addEventListener("input", function(){ fieldEl(h).dataset.manual = "1"; }); });
  }
  if(sec.key === "project_deposits"){
    var calcDep = function(){
      var tot = fieldEl("Project Total").value, p = fieldEl("Deposit %").value;
      if(tot !== "" && p !== "" && !fieldEl("Deposit").dataset.manual) fieldEl("Deposit").value = Math.round(Number(tot) * (Number(p) > 1 ? Number(p) / 100 : Number(p)) * 100) / 100;
    };
    ["Project Total", "Deposit %"].forEach(function(h){ fieldEl(h).addEventListener("input", calcDep); });
    fieldEl("Deposit").addEventListener("input", function(){ fieldEl("Deposit").dataset.manual = "1"; });
  }
  if(sec.key === "ledger_changes"){
    var reasonEl = fieldEl("Reason");
    var syncReason = function(){
      var r = reasonEl.value;
      var needs = reasonNeedsIc(r);
      fldBox("Move Pay To").classList.toggle("dim", !needs);
      fldBox("New IC Amount").classList.toggle("dim", !needs);
      fldBox("Reason Detail").classList.toggle("must", r === "Other");
    };
    reasonEl.addEventListener("change", syncReason); syncReason();
    if(!values["Month Affected"]) fieldEl("Month Affected").value = monthName(values.__month || monthKey());
  }
  return {
    read: function(){ var o = {}; sec.cols.forEach(function(h){ o[h] = fields[h](); }); return o; },
    problems: function(){
      var p = [], o = this.read();
      if(sec.key !== "office_inventory" && !o.Account) p.push("Account: pick one from the list (or add it).");
      sec.cols.forEach(function(h){
        var t = FIELD[h];
        if((t === "account" || t === "ic") && combos[h] && !combos[h].get() && combos[h].typed()) p.push(h + ': "' + combos[h].typed() + '" is not in the list. Pick a match or use Add.');
      });
      if(sec.key === "ledger_changes"){
        if(!o.Reason) p.push("Reason: pick one.");
        if(o.Reason === "Other" && !o["Reason Detail"]) p.push("Reason Detail is required when Reason is Other.");
        if(reasonNeedsIc(o.Reason) && !o["Move Pay To"]) p.push("Move Pay To: this reason needs the IC who should be paid.");
      }
      return p;
    },
    combos: combos,
    focusFirst: function(){ var f = host.querySelector("input,select,textarea"); if(f) f.focus(); }
  };
}

/* ---------- CSS shared by the pages that build forms ---------- */
var CSS = '.frm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 14px}' +
'.fld label{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--grey);margin-bottom:4px}' +
'.fld label .req{font-weight:400;text-transform:none;letter-spacing:0;color:var(--red);margin-left:6px;font-size:10.5px}' +
'.fld.wide{grid-column:1/-1}.fld.dim{opacity:.45}.fld.must label{color:var(--red)}' +
'.fld input,.fld select,.fld textarea{width:100%;font:inherit;font-size:13px;border:1.5px solid var(--border);border-radius:8px;padding:8px 10px;background:#fff;outline:none;min-height:38px}' +
'.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:var(--red)}' +
'.fld input.astyped{background:var(--gold-bg,#FFF4D6)}.fld textarea{resize:vertical}' +
'.fld .help{display:block;font-size:11px;color:var(--grey);margin-top:3px;line-height:1.4}' +
'.cbx{position:relative}.cbx .cbx-in{padding-right:34px;cursor:pointer}.cbx-in.ok{border-color:#1E8E5A;background:#F3FBF6}.cbx-in.bad{border-color:var(--red);background:#FFF1F1}' +
'.cbx-caret{position:absolute;right:4px;top:4px;height:30px;width:28px;border:none;background:none;color:var(--grey);cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center}.cbx-caret:hover{background:var(--light);color:var(--black)}.cbx.open .cbx-caret svg{transform:rotate(180deg)}' +
'.fld select.pick{margin-bottom:6px;color:var(--grey);font-size:12px;background:var(--light)}.fld select.pick:has(option:checked:not([value=""])){color:var(--black)}' +
'.cbx-list{position:absolute;left:0;right:0;top:100%;z-index:50;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(45,42,38,.14);max-height:280px;overflow:auto;margin-top:3px}' +
'.cbx-list.hidden{display:none}.cbx-opt{padding:7px 10px;font-size:12.5px;cursor:pointer;display:flex;flex-wrap:wrap;gap:0 8px;align-items:baseline}' +
'.cbx-opt:hover,.cbx-opt.sel{background:#FFF4F4}.cbx-opt em{font-style:normal;font-size:10px;color:#fff;background:var(--grey);border-radius:4px;padding:1px 5px}' +
'.cbx-opt small{width:100%;color:var(--grey);font-size:11px}.cbx-none{padding:9px 10px;font-size:12px;color:var(--grey)}' +
'.cbx-tools{display:flex;gap:6px;margin-top:5px}.mini{font:inherit;font-size:11px;font-weight:700;border:1.5px solid var(--border);background:#fff;border-radius:6px;padding:4px 9px;cursor:pointer;color:var(--black)}' +
'.mini:hover{border-color:var(--red);color:var(--red)}' +
'.act-tbl{width:100%;border-collapse:collapse;font-size:12px;table-layout:auto}.act-tbl th{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:#203864;text-align:left;padding:8px 8px;white-space:normal;line-height:1.3;vertical-align:bottom}' +
'.act-tbl td{padding:7px 8px;border-bottom:1px solid var(--border);vertical-align:top;overflow-wrap:break-word}.act-tbl td.num,.act-tbl th.num{text-align:right;white-space:nowrap}.act-tbl td.dt{white-space:nowrap}.act-tbl th.cb{width:52px;text-align:center}' +
'.act-tbl tr.done td{background:#0AA6A9;color:#fff}.act-tbl tr.done td a{color:#fff}.act-tbl tr.void td{opacity:.5;text-decoration:line-through}' +
'.act-tbl tr.row:hover td{outline:2px solid var(--gold,#E5B423);outline-offset:-2px;cursor:pointer}' +
'.act-tbl td.cb{text-align:center;width:44px}.act-tbl td.cb input{width:18px;height:18px;cursor:pointer;accent-color:#0AA6A9}' +
'.act-tbl tr.done td.cb input{accent-color:#fff}' +
'.act-tbl td .who{display:block;font-size:10px;color:inherit;opacity:.75}' +
'.act-tbl td.ch,.act-tbl th.ch{text-align:center;width:56px;white-space:nowrap}.act-tbl td.ch .chat{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--light,#F3F2F0);color:var(--grey,#636466)}' +
'.act-tbl td.ch .chat.has{background:#203864;color:#fff}.act-tbl td.ch .chat.q{background:#E5B423;color:#2D2A26}.act-tbl td.ch .chat.none{opacity:.35}.act-tbl tr.done td.ch .chat{background:rgba(255,255,255,.25);color:#fff}.act-tbl tr.done td.ch .chat.q{background:#E5B423;color:#2D2A26}' +
'.act-tbl td.ch .chat svg{width:12px;height:12px}' +
'.cpanel{display:flex;flex-direction:column;min-height:0;height:100%}.cpanel .ch-head{font-size:12px;font-weight:700;color:var(--black);display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--border)}' +
'.cpanel .ch-head svg{width:14px;height:14px;flex:none}.cpanel .ch-head .n{font-size:10px;background:var(--light);color:var(--grey);border-radius:999px;padding:1px 7px}.cpanel .ch-head .oq{font-size:10px;background:#E5B423;color:#2D2A26;border-radius:999px;padding:1px 7px}' +
'.cpanel .ch-list{flex:1;overflow:auto;min-height:120px;padding:10px 2px;display:flex;flex-direction:column;gap:8px}' +
'.cmsg{background:var(--light,#F3F2F0);border-radius:10px;padding:8px 10px;font-size:12.5px;line-height:1.45;max-width:92%;align-self:flex-start;white-space:pre-wrap;overflow-wrap:break-word}.cmsg.me{align-self:flex-end;background:#EAF0FA}.cmsg.q{border-left:3px solid #E5B423}' +
'.cmsg .cm-who{display:block;font-size:10.5px;color:var(--grey);margin-bottom:2px}.cmsg .cm-who b{color:var(--black)}.cmsg .cm-who .qtag{color:#8A5A00;font-weight:700;margin-left:6px}' +
'.cpanel .ch-empty{color:var(--grey);font-size:12px;text-align:center;padding:18px 8px}' +
'.cpanel .ch-form{border-top:1px solid var(--border);padding-top:8px;display:flex;flex-direction:column;gap:6px}.cpanel textarea{font:inherit;font-size:12.5px;border:1.5px solid var(--border);border-radius:8px;padding:8px 10px;min-height:64px;resize:vertical;width:100%;box-sizing:border-box}.cpanel textarea:focus{outline:none;border-color:var(--red)}' +
'.cpanel .ch-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cpanel .ch-row label{font-size:11.5px;display:inline-flex;gap:5px;align-items:center;color:var(--grey);cursor:pointer}.cpanel .ch-row .sp{flex:1}.cpanel .ch-hint{font-size:10.5px;color:var(--grey)}';

function injectCss(){ if($("actSharedCss")) return; var s = document.createElement("style"); s.id = "actSharedCss"; s.textContent = CSS; document.head.appendChild(s); }

/* ---------- chat (comments on an entry) ---------- */
var CHAT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.6-4.6A8 8 0 1 1 21 12z"/></svg>';
function chatBadge(e){
  var n = Number(e.comments) || 0;
  if(!n) return '<span class="chat none" title="No chat notes yet. Open the entry to leave one.">' + CHAT_SVG + '</span>';
  var t = n + (n === 1 ? " note" : " notes") + (e.last_comment ? ". Last " + e.last_comment : "") + (e.open_q ? ". Open question, needs a reply." : "");
  return '<span class="chat has' + (e.open_q ? ' q' : '') + '" title="' + esc(t) + '">' + CHAT_SVG + n + (e.open_q ? ' ?' : '') + '</span>';
}
/* commentPanel(host, entry, {api(payload)->Promise, who()->string, onChange(summary)}) renders the thread and composer. */
function commentPanel(host, e, opts){
  opts = opts || {};
  host.innerHTML = '<div class="cpanel"><div class="ch-head">' + CHAT_SVG + ' Chat on ' + esc(e.entry_id) + ' <span class="n" data-n>' + (Number(e.comments) || 0) + '</span>' + (e.open_q ? '<span class="oq" data-oq>open question</span>' : '<span class="oq hidden" data-oq>open question</span>') + '</div>' +
    '<div class="ch-list" data-list><div class="ch-empty"><span class="spin"></span>Loading...</div></div>' +
    '<div class="ch-form"><textarea data-text placeholder="Ask accounting a question or leave a note for whoever reads this entry next..." rows="3"></textarea>' +
    '<div class="ch-row"><label title="Shows a gold ? on the row until someone answers"><input type="checkbox" data-q> Needs a reply</label><span class="sp"></span><span class="ch-hint">Ctrl+Enter posts</span><button class="btn solid" type="button" data-post>Post</button></div></div></div>';
  var list = host.querySelector("[data-list]"), ta = host.querySelector("[data-text]"), qb = host.querySelector("[data-q]"), btn = host.querySelector("[data-post]");
  var me = (opts.who && opts.who()) || "";
  function render(rows){
    if(!rows.length){ list.innerHTML = '<div class="ch-empty">No notes yet. Questions from accounting and answers from the FSM live here, next to the entry.</div>'; return; }
    list.innerHTML = rows.map(function(c){
      var mine = me && c.who && c.who.toLowerCase() === me.toLowerCase();
      return '<div class="cmsg' + (mine ? ' me' : '') + (c.needs_reply ? ' q' : '') + '"><span class="cm-who"><b>' + esc(c.who || "?") + '</b> · ' + esc(c.when || "") + (c.needs_reply ? '<span class="qtag">needs a reply</span>' : '') + '</span>' + esc(c.text || "") + '</div>';
    }).join("");
    list.scrollTop = list.scrollHeight;
  }
  function summary(n, oq){ host.querySelector("[data-n]").textContent = n; host.querySelector("[data-oq]").classList.toggle("hidden", !oq); }
  var rows = [];
  opts.api({ kind: "vd_act_comments", entry_id: e.entry_id }).then(function(r){ rows = (r && r.comments) || []; render(rows); }).catch(function(){ list.innerHTML = '<div class="ch-empty">Could not load the chat.</div>'; });
  function post(){
    var text = ta.value.trim();
    if(!text){ ta.focus(); return; }
    var w = (opts.who && opts.who()) || "";
    if(!w){ if(opts.needName) opts.needName(); return; }
    me = w;
    btn.disabled = true;
    opts.api({ kind: "vd_act_comment_add", entry_id: e.entry_id, text: text, needs_reply: qb.checked }).then(function(r){
      btn.disabled = false;
      if(!r || !r.ok){ if(opts.toast) opts.toast((r && r.error) || "Could not post.", "err"); return; }
      rows.push(r.comment); render(rows); ta.value = ""; qb.checked = false;
      e.comments = r.comments; e.last_comment = r.last_comment; e.open_q = r.open_q;
      summary(r.comments, r.open_q);
      var tr = document.querySelector('tr[data-id="' + e.entry_id + '"] td.ch'); if(tr) tr.innerHTML = chatBadge(e);
      if(opts.onChange) opts.onChange(e, r);
    }).catch(function(){ btn.disabled = false; if(opts.toast) opts.toast("Could not reach the server.", "err"); });
  }
  btn.onclick = post;
  ta.addEventListener("keydown", function(ev){ if((ev.ctrlKey || ev.metaKey) && ev.key === "Enter"){ ev.preventDefault(); post(); } });
  return { post: post, focus: function(){ ta.focus(); } };
}

/* ---------- section table (viewer, queue) ---------- */
/* entries for ONE section. opts = {onToggle(entry, checked), onOpen(entry), showMonth, showRegion} */
function sectionTable(sec, entries, opts){
  opts = opts || {};
  var cols = sec.cols.slice();
  var hasExtras = entries.some(function(e){ return e.legacy_extras; });
  var h = '<div class="tblwrap"><table class="act-tbl"><thead><tr>';
  if(opts.showRegion) h += '<th>Region</th>';
  if(opts.showMonth) h += '<th class="dt">Month</th>';
  cols.forEach(function(c){ h += '<th class="' + numClass(c).trim() + '">' + esc(c) + '</th>'; });
  if(hasExtras) h += '<th>Excel extras</th>';
  h += '<th class="ch" title="Chat notes and questions on the entry">Chat</th>';
  if(!sec.nocheck) h += '<th class="cb" title="Accounting Complete">Acct.<br>Complete</th>';
  h += '</tr></thead><tbody>';
  if(!entries.length) h += '<tr><td colspan="' + (cols.length + 5) + '" class="empty">No entries.</td></tr>';
  entries.forEach(function(e){
    h += '<tr class="row' + (e.complete ? ' done' : '') + (e.status === "Voided" ? ' void' : '') + '" data-id="' + esc(e.entry_id) + '">';
    if(opts.showRegion) h += '<td>' + esc(e.region) + '</td>';
    if(opts.showMonth) h += '<td class="dt">' + esc(e.month) + '</td>';
    cols.forEach(function(c){ h += '<td class="' + numClass(c).trim() + '">' + esc(display(c, e.fields[c])) + '</td>'; });
    if(hasExtras) h += '<td><small>' + esc(e.legacy_extras || "") + '</small></td>';
    h += '<td class="ch">' + chatBadge(e) + '</td>';
    if(!sec.nocheck) h += '<td class="cb"><input type="checkbox"' + (e.complete ? ' checked' : '') + ' title="' + esc(e.complete ? ("Checked by " + (e.completed_by || "?") + (e.completed_at ? " " + e.completed_at : "")) : "Not yet checked by accounting") + '">' + (e.complete && e.completed_by && e.completed_by !== "Excel (checked before import)" ? '<span class="who">' + esc(e.completed_by.split(" ")[0]) + '</span>' : '') + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  var box = document.createElement("div"); box.innerHTML = h;
  box.querySelectorAll("tr.row").forEach(function(tr){
    var id = tr.getAttribute("data-id");
    var e = entries.filter(function(x){ return x.entry_id === id; })[0];
    var cb = tr.querySelector("td.cb input");
    if(cb) cb.addEventListener("click", function(ev){ ev.stopPropagation(); if(opts.onToggle) opts.onToggle(e, cb.checked, cb, tr); });
    tr.addEventListener("click", function(ev){ if(ev.target.tagName === "INPUT") return; if(ev.target.closest("td.ch") && opts.onChat){ opts.onChat(e, tr); return; } if(opts.onOpen) opts.onOpen(e, tr); });
  });
  return box;
}

function post(payload, pass){
  payload = payload || {}; payload.passcode = pass;
  return fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) }).then(function(r){ return r.json(); });
}

window.ACT = { WEBHOOK: WEBHOOK, OPS: OPS, BOM: BOMURL, REGIONS: REGIONS, REGION_KEY: REGION_KEY, KEY_REGION: KEY_REGION, FIXED_ICS: FIXED_ICS,
  SECTIONS: SECTIONS, FIELD: FIELD, section: section, esc: esc, monthKey: monthKey, monthName: monthName, monthKeyOf: monthKeyOf, shiftMonth: shiftMonth, monthRange: monthRange,
  money: money, pct: pct, dateOut: dateOut, display: display, setContext: setContext, ctx: function(){ return CTX; },
  accountsFor: accountsFor, vendorsFor: vendorsFor, fsmsFor: fsmsFor, ctypesFor: ctypesFor, reasons: reasons, reasonNeedsIc: reasonNeedsIc,
  combo: combo, buildForm: buildForm, injectCss: injectCss, sectionTable: sectionTable, chatBadge: chatBadge, commentPanel: commentPanel, post: post };
})();
