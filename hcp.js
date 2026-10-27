(async function () {
'use strict';
var HOST = 'areariservata.federgolf.it';
var GRID = '/Risultati/ShowGrid';
var DAL_ANNO = 2024;
var KEY = 'aggiornaHcp.v2';
if (location.hostname !== HOST) {
location.href = 'https://' + HOST + GRID;
return;
}
await main();
async function main() {
function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function num(s) { if (s === '' || s == null) return null; var n = Number(String(s).replace(',', '.')); return isNaN(n) ? null : n; }
function tc(s) { return norm(s).toLowerCase().replace(/(^|[\s'.\-(])\S/g, function (m) { return m.toUpperCase(); }); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function f1(v) { return v == null || isNaN(v) ? '—' : Number(v).toFixed(1); }
function f2(v) { return v == null || isNaN(v) ? '—' : Number(v).toFixed(2); }
function sg(v) { return v == null || isNaN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1); }
function r1(v) { return v == null || isNaN(v) ? null : Math.round(v * 10) / 10; }
function r2(v) { return v == null || isNaN(v) ? null : Math.round(v * 100) / 100; }
function avg(a) { return a.length ? a.reduce(function (t, v) { return t + v; }, 0) / a.length : null; }
function dIt(s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); }
function dSh(s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(2, 4); }
var TIPI = { SPS: 'Singola Stableford', SPM: 'Singola Medal', SPP: 'Singola Par', '4PS': '4 palle Stableford', '4PM': '4 palle Medal', L2S: 'Louisiana a 2 Stableford', L2M: 'Louisiana a 2 Medal', L4S: 'Louisiana a 4 Stableford', L4M: 'Louisiana a 4 Medal', P2S: 'Squadre Stableford (2 score)', P2M: 'Squadre Medal (2 score)', GSS: 'Greensome Stableford', GSM: 'Greensome Medal', FSS: 'Foursome Stableford', FSM: 'Foursome Medal' };
function trovaTabella(doc) {
return Array.prototype.find.call(doc.querySelectorAll('table'), function (t) {
return Array.prototype.some.call(t.querySelectorAll('th'), function (h) { return norm(h.textContent) === 'Index Nuovo'; });
});
}
async function scaricaGriglia() {
var r = await fetch(GRID, { credentials: 'same-origin', cache: 'no-store' });
var txt = await r.text();
return new DOMParser().parseFromString(txt, 'text/html');
}
function leggi(doc) {
var tab = trovaTabella(doc);
if (!tab) return null;
var tutte = Array.prototype.slice.call(tab.querySelectorAll('tr'));
var intest = tutte.find(function (r) { return Array.prototype.some.call(r.cells, function (c) { return norm(c.textContent) === 'Index Nuovo'; }); });
var col = {};
Array.prototype.forEach.call(intest.cells, function (c, i) { col[norm(c.textContent)] = i; });
var righe = tutte.filter(function (r) { return r !== intest && r.cells.length === intest.cells.length; });
function g(r, k) { var i = col[k]; return i == null || !r.cells[i] ? '' : norm(r.cells[i].textContent); }
var gare = righe.map(function (r) {
var p = g(r, 'Data').split('/');
var v = g(r, 'Valida'), buche = num(g(r, 'Buche')), formula = g(r, 'Formula'), giro = num(g(r, 'Giro')) || 1;
var valida = (v === 'S' || v === 'V') ? (buche === 9 ? 'Sì (9 buche)' : 'Sì') : 'No';
var data = p[2] + '-' + p[1] + '-' + p[0];
return {
id: data + '_' + giro, data: data, anno: Number(p[2]), desc: g(r, 'Descrizione'), gara: g(r, 'Gara'), circolo: tc(g(r, 'Esecutore')),
giro: giro, formula: formula, tipo: TIPI[formula] || formula, buche: buche, valida: valida, playing_hcp: num(g(r, 'Playing HCP')),
par: num(g(r, 'Par')), cr: num(g(r, 'CR')), sr: num(g(r, 'SR')), stableford: g(r, 'Stbl'),
lordo_ags: valida !== 'No' ? num(g(r, 'AGS')) : null, pcc: num(g(r, 'PCC')), sd: valida !== 'No' ? num(g(r, 'SD')) : null,
corr_sd: num(g(r, 'Corr SD')), hcp_prima: num(g(r, 'Index Vecchio')), hcp_dopo: num(g(r, 'Index Nuovo')), variazione: num(g(r, 'Variazione'))
};
}).filter(function (x) { return x.anno && /Risultati gara/i.test(x.desc); });
var minimo = null, da = null;
righe.forEach(function (r) {
var p = g(r, 'Data').split('/'), v = num(g(r, 'Index Nuovo'));
if (p.length === 3) { var y = Number(p[2]); if (!da || y < da) da = y; }
if (v == null || p.length !== 3) return;
var d = p[2] + '-' + p[1] + '-' + p[0];
if (!minimo || v < minimo.hcp_dopo || (v === minimo.hcp_dopo && d < minimo.data)) minimo = { hcp_dopo: v, data: d, gara: g(r, 'Gara') || g(r, 'Descrizione').split(' - ').slice(1).join(' - ') };
});
return { gare: gare, minimo: minimo, da: da };
}
function caricaTutto() {
return new Promise(function (res) {
var fr = document.createElement('iframe'), fase = 0, chiuso = false;
fr.setAttribute('aria-hidden', 'true');
fr.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;opacity:0;border:0';
var timer = setTimeout(function () { fine(null); }, 30000);
function fine(v) { if (chiuso) return; chiuso = true; clearTimeout(timer); res(v); setTimeout(function () { fr.remove(); }, 0); }
fr.onload = function () {
var d; try { d = fr.contentDocument; } catch (e) { return fine(null); }
if (!d || !trovaTabella(d)) return fine(fase === 0 ? 'login' : null);
var s = d.getElementById('pagesize');
if (fase === 0 && s && s.value !== '1000') {
fase = 1; s.value = '1000';
if (fr.contentWindow.rowsPerPageChanged) s.dispatchEvent(new Event('change', { bubbles: true })); else s.form.submit();
return;
}
try { fine(leggi(d)); } catch (e) { fine(null); }
};
fr.src = GRID;
(document.body || document.documentElement).appendChild(fr);
});
}
async function carica() {
var L = await caricaTutto();
if (L === 'login') throw new Error('login');
if (!L) { L = leggi(trovaTabella(document) ? document : await scaricaGriglia()); if (!L) throw new Error('login'); }
var nomi = L.gare.map(function (x) { return x.desc.split(' - ')[0]; }).filter(Boolean);
var cn = (nomi[0] || '').split(',');
return { nome: tc(cn[1] || ''), cognome: tc(cn[0] || ''), salvato: new Date().toISOString(), tutte: L.gare, minimo: L.minimo, da: L.da };
}
function salva(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
function salvati() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
var dati, avviso = '', wait = null;
try {
wait = document.createElement('div');
wait.textContent = 'Aggiorna HCP: leggo i risultati da Federgolf…';
wait.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#1f1e1c;color:#fff;font:600 15px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;padding:10px 18px;border-radius:99px;box-shadow:0 6px 20px rgba(0,0,0,.25)';
(document.body || document.documentElement).appendChild(wait);
} catch (e) {}
try { dati = await carica(); salva(dati); }
catch (e) {
dati = salvati();
if (wait) wait.remove();
if (!dati) { alert('Accedi all\'area riservata Federgolf con le tue credenziali, poi clicca di nuovo "Aggiorna HCP".'); return; }
avviso = 'Non risulti collegato a Federgolf: stai vedendo i dati salvati il ' + new Date(dati.salvato).toLocaleDateString('it-IT') + '. Accedi e clicca di nuovo "Aggiorna HCP" per aggiornarli.';
}
var tutte = dati.tutte.slice().sort(function (a, b) { return a.data.localeCompare(b.data) || a.giro - b.giro; });
var gare = tutte.filter(function (r) { return r.anno >= DAL_ANNO; });
if (!gare.length) { alert('Nessun risultato gara trovato dal ' + DAL_ANNO + '.'); return; }
var titolo = 'Gare & HCP ' + (dati.nome || dati.cognome || 'Golf');
var isV = function (r) { return r.valida !== 'No' && r.sd != null; };
var inMedia = function (r) { return isV(r) && String(r.stableford).toUpperCase() !== 'NR'; };
var annoMax = Math.max.apply(null, gare.map(function (r) { return r.anno; }));
var ultimo = gare[gare.length - 1];
var ult20 = gare.filter(isV).map(function (r) { return Object.assign({}, r, { sd: r1(r.sd + (r.corr_sd || 0)) }); })
.sort(function (a, b) { return b.data.localeCompare(a.data) || b.giro - a.giro; }).slice(0, 20);
var n20 = ult20.length;
var kBest = n20 >= 20 ? 8 : n20 === 19 ? 7 : n20 >= 17 ? 6 : n20 >= 15 ? 5 : n20 >= 12 ? 4 : n20 >= 9 ? 3 : n20 >= 6 ? 2 : n20 >= 3 ? 1 : 0;
var bestIds = {};
ult20.slice().sort(function (a, b) { return a.sd - b.sd || b.data.localeCompare(a.data); }).slice(0, kBest).forEach(function (r) { bestIds[r.id] = true; });
ult20.forEach(function (r) { r.migliore = !!bestIds[r.id]; r.lordo_18 = r.buche === 9 ? 72 + Math.ceil(r.sd - 1e-9) : r.lordo_ags; });
var migliori = ult20.filter(function (r) { return r.migliore; });
var adj = n20 === 3 ? -2 : (n20 === 4 || n20 === 6) ? -1 : 0;
var media8 = migliori.length ? r2(avg(migliori.map(function (r) { return r.sd; })) + adj) : null;
var media8sd = migliori.length ? r2(avg(migliori.map(function (r) { return r.sd; }))) : null;
var lm = migliori.filter(function (r) { return r.lordo_18 != null; });
var media8lordo = lm.length ? r1(avg(lm.map(function (r) { return r.lordo_18; }))) : null;
var uscente = null;
if (n20 >= 20) {
var ord = ult20.slice().sort(function (a, b) { return a.data.localeCompare(b.data) || a.giro - b.giro; });
var resto = ord.slice(1).map(function (r) { return r.sd; }).sort(function (a, b) { return a - b; });
uscente = Object.assign({}, ord[0], { soglia: resto[7], media_dopo: r2(avg(resto.slice(0, 8))) });
}
var perPar = gare.filter(function (r) { return inMedia(r) && r.anno >= annoMax - 2 && r.lordo_ags != null && r.par != null; });
var sopraTot = perPar.length ? r1(avg(perPar.map(function (r) { return r.lordo_ags - r.par; }))) : null;
var parAnni = [];
for (var a = annoMax - 2; a <= annoMax; a++) {
var gg = perPar.filter(function (r) { return r.anno === a; });
if (!gg.length) continue;
var sdA = gare.filter(function (r) { return r.anno === a && inMedia(r); }).map(function (r) { return r.sd; });
parAnni.push({ anno: a, sopra: r1(avg(gg.map(function (r) { return r.lordo_ags - r.par; }))), sdm: r1(avg(sdA)), n: gg.length });
}
function statAnno(anno) {
var g = gare.filter(function (r) { return r.anno === anno; });
var v = g.filter(isV), m = g.filter(inMedia);
var s = m.filter(function (r) { return r.lordo_ags != null && r.par != null; });
var l18 = m.filter(function (r) { return r.buche === 18 && r.lordo_ags != null; }).map(function (r) { return r.lordo_ags; });
var sopra = s.length ? r1(avg(s.map(function (r) { return r.lordo_ags - r.par; }))) : null;
var hi = g[0].hcp_prima, hf = g[g.length - 1].hcp_dopo;
return {
anno: anno, gare: g.length, valide: v.length, hcp_inizio: hi, hcp_fine: hf, delta: r1(hf - hi),
perc: g.length ? Math.round(v.length / g.length * 1000) / 10 : null, sopra: sopra, score: sopra == null ? null : r1(72 + sopra),
sdm: m.length ? avg(m.map(function (r) { return r.sd; })) : null, best: m.length ? Math.min.apply(null, m.map(function (r) { return r.sd; })) : null,
lordo: l18.length ? r1(avg(l18)) : null
};
}
var anni = []; gare.forEach(function (r) { if (anni.indexOf(r.anno) < 0) anni.push(r.anno); });
anni.sort(function (a, b) { return b - a; });
var perAnno = anni.map(statAnno);
var S = perAnno[0];
var minimo = dati.minimo || tutte.filter(function (r) { return r.hcp_dopo != null; }).reduce(function (m, r) { return !m || r.hcp_dopo < m.hcp_dopo ? r : m; }, null);
var daAnno = dati.da || (tutte.length ? tutte[0].anno : DAL_ANNO);
var H0 = ultimo.hcp_dopo;
var pegg = ult20.filter(function (r) { return !r.migliore; }).map(function (r) { return r.sd; });
var tuttiSd = ult20.map(function (r) { return r.sd; });
var anti = {
  n: pegg.length, nTot: tuttiSd.length,
  val: pegg.length ? r1(avg(pegg)) : null, m20: tuttiSd.length ? r1(avg(tuttiSd)) : null,
  dA: pegg.length && media8sd != null ? r1(avg(pegg) - media8sd) : null,
  d20: tuttiSd.length && media8sd != null ? r1(avg(tuttiSd) - media8sd) : null,
  peg: pegg.length ? Math.max.apply(null, pegg) : null
};
var campi = (function () {
  var m = {};
  gare.filter(function (r) { return r.buche === 18 && r.cr != null && r.sr != null && r.par != null; }).forEach(function (r) {
    var k = r.circolo + '|' + r.cr + '|' + r.sr + '|' + r.par;
    if (!m[k]) m[k] = { circolo: r.circolo, cr: r.cr, sr: r.sr, par: r.par, giri: 0, giriAnno: 0, ultima: '' };
    m[k].giri++; if (r.anno === annoMax) m[k].giriAnno++; if (r.data > m[k].ultima) m[k].ultima = r.data;
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.giri - a.giri || b.ultima.localeCompare(a.ultima); });
})();
var campoRif = campi.slice().sort(function (a, b) { return b.giriAnno - a.giriAnno || b.giri - a.giri; })[0] || null;
var ult20Asc = ult20.slice().sort(function (a, b) { return a.data.localeCompare(b.data) || a.giro - b.giro; });
function kTab(n) { return n >= 20 ? 8 : n === 19 ? 7 : n >= 17 ? 6 : n >= 15 ? 5 : n >= 12 ? 4 : n >= 9 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0; }
function simGara(win, H, x) {
  var pieno = win.length >= 20, esce = pieno ? win[0] : null;
  var w = (pieno ? win.slice(1) : win.slice()).concat([{ data: '9999-12-31', sd: x }]);
  var n = w.length, k = kTab(n), ad = n === 3 ? -2 : (n === 4 || n === 6) ? -1 : 0;
  var d = Math.round((H - x) * 10), e = d >= 100 ? 2 : d >= 70 ? 1 : 0;
  if (e) w = w.map(function (s) { return { data: s.data, sd: r1(s.sd - e) }; });
  if (!k) return { hi: H, esr: e, esce: esce, w: w };
  var b = w.map(function (s) { return s.sd; }).sort(function (p, q) { return p - q; }).slice(0, k);
  return { hi: Math.round((avg(b) + ad) * 10 + 1e-9) / 10, esr: e, esce: esce, w: w };
}
var scen = null;
if (campoRif && ult20.length && H0 != null) {
  var cR = campoRif, chR = Math.round(H0 * cR.sr / 113 + cR.cr - cR.par);
  var sdOf = function (a) { return Math.round((113 / cR.sr) * (a - cR.cr) * 10) / 10; };
  var sdMed = avg(tuttiSd), centro = Math.round(sdMed * cR.sr / 113 + cR.cr);
  var winS = ult20Asc.map(function (r) { return { data: r.data, sd: r.sd }; });
  var righeS = [];
  for (var aS = centro - 4; aS <= centro + 4; aS++) {
    var sdS = sdOf(aS), rS = simGara(winS, H0, sdS);
    righeS.push({ lordo: aS, sp: aS - cR.par, stb: 36 + chR - (aS - cR.par), sd: sdS, hcp: rS.hi, v: r1(rS.hi - H0), esr: rS.esr, centro: aS === centro });
  }
  scen = { campo: cR, ch: chR, sdMed: r1(sdMed), centro: centro, righe: righeS, esce: n20 >= 20 ? ult20Asc[0] : null };
}
var nomiMesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
var mesiTab = (function () {
  var v = gare.filter(function (r) { return inMedia(r) && r.anno >= annoMax - 2; });
  var anniM = [annoMax - 2, annoMax - 1, annoMax].filter(function (a) { return v.some(function (r) { return r.anno === a; }); });
  var mesi = []; v.forEach(function (r) { var m = Number(r.data.slice(5, 7)); if (mesi.indexOf(m) < 0) mesi.push(m); });
  mesi.sort(function (a, b) { return a - b; });
  var righe = mesi.map(function (m) {
    var riga = { mese: nomiMesi[m - 1], c: {} }, all = [];
    anniM.forEach(function (a) { var s = v.filter(function (r) { return r.anno === a && Number(r.data.slice(5, 7)) === m; }).map(function (r) { return r.sd; }); riga.c[a] = { sd: s.length ? r1(avg(s)) : null, n: s.length }; all = all.concat(s); });
    riga.c.tot = { sd: all.length ? r1(avg(all)) : null, n: all.length };
    return riga;
  });
  return { anni: anniM, righe: righe };
})();
var soglie = (function () {
  var lab = function (s) { return s === 0 ? 'sotto par' : 'sotto ' + (s > 0 ? '+' : '−') + Math.abs(s); };
  if (H0 == null || H0 < 9 || !campoRif) return { adattate: false, lista: [8, 5, 3, 0].map(function (s) { return { s: s, l: lab(s) }; }) };
  var ch = Math.round(H0 * campoRif.sr / 113 + campoRif.cr - campoRif.par), f = H0 / 9;
  return { adattate: true, ch: ch, lista: [4, 1, -1, -4].map(function (o) { var s = ch + Math.round(o * f); return { s: s, l: lab(s) }; }) };
})();
var serie = (function () {
  var v = gare.filter(function (r) { return r.valida !== 'No' && r.buche === 18 && r.lordo_ags != null && r.par != null; });
  var fsp = function (d) { return d === 0 ? 'par' : (d > 0 ? '+' : '−') + Math.abs(d); };
  var out = {};
  soglie.lista.forEach(function (sg0) {
    var lista = [], cur = [];
    var chiudi = function (stop) {
      if (!cur.length) return;
      var sp = cur.map(function (r) { return r.lordo_ags - r.par; });
      var best = cur.reduce(function (a, r) { return r.lordo_ags - r.par < a.lordo_ags - a.par ? r : a; });
      lista.push({ key: sg0.s + '_' + cur[0].id, giri: cur.length, dal: dIt(cur[0].data), al: dIt(cur[cur.length - 1].data), dalIso: cur[0].data,
        media: r1(avg(sp)), miglior: best.lordo_ags + ' (' + fsp(best.lordo_ags - best.par) + ')', inCorso: !stop,
        det: cur.map(function (r) { return { data: dIt(r.data), circolo: r.circolo, lordo: r.lordo_ags, sp: fsp(r.lordo_ags - r.par), sd: r.sd }; }) });
      cur = [];
    };
    v.forEach(function (r) { if (r.lordo_ags - r.par < sg0.s) cur.push(r); else chiudi(r); });
    chiudi(null);
    lista.sort(function (a, b) { return b.giri - a.giri || b.dalIso.localeCompare(a.dalIso); });
    out[sg0.s] = lista;
  });
  return out;
})();
function fspN(v) { return v === 0 ? 'par' : (v > 0 ? '+' : '−') + Math.abs(v); }
function fsd(v) { return v == null ? '—' : f1(v).replace('-', '−'); }
function htmlAnti() {
if (!anti.nTot) return '';
return '<dl class="anti"><div class="ar"><dt>Anti HCP · ' + anti.n + ' peggiori</dt><dd><b>' + f1(anti.val) + '</b> (' + sg(anti.dA) + ')</dd></div>' +
'<div class="ar"><dt>Media di tutti i ' + anti.nTot + '</dt><dd><b>' + f1(anti.m20) + '</b> (' + sg(anti.d20) + ')</dd></div>' +
'<p class="an">Tra parentesi la distanza dalla media dei migliori. Peggior SD: ' + f1(anti.peg) + '</p></dl>';
}
function htmlScen() {
if (!scen) return '';
var c = scen.campo, e = scen.esce, frase;
if (e) frase = 'Alla prossima gara esce il giro del <b>' + dIt(e.data) + '</b> (SD ' + f1(e.sd) + '), che <b>' + (e.migliore ? 'è tra i migliori' : 'non è tra i migliori') + '</b>' + (e.migliore ? ': con un giro sotto la sua media l’HCP può salire.' : ': l’HCP non può salire, al massimo resta uguale.');
else frase = 'Hai meno di 20 score validi: il prossimo si aggiunge senza farne uscire nessuno.';
var lastE = null; scen.righe.forEach(function (r) { if (r.esr) lastE = r; });
var esrTxt = '* Punti Stableford stimati con playing HCP ' + scen.ch + ', se nessuna buca supera il doppio bogey netto.';
if (lastE) { var nx = scen.righe[scen.righe.indexOf(lastE) + 1]; esrTxt += ' Le righe evidenziate fanno scattare l’Exceptional Score Reduction: un SD almeno 7 colpi sotto l’HCP toglie 1 punto in più, almeno 10 colpi sotto ne toglie 2.' + (nx ? ' Per questo passando da <b>' + nx.lordo + '</b> a <b>' + lastE.lordo + '</b> l’HCP fa un salto.' : ''); }
return '<section class="card"><div><h2 class="ct">Scenari prossima gara</h2>' +
'<p class="cn">Cosa succede al tuo HCP (oggi <b class="strong">' + f1(H0) + '</b>) per ogni lordo alla prossima gara valida, su <b class="strong">' + esc(c.circolo) + '</b>, il campo con più gare nel ' + annoMax + ' (' + c.giriAnno + (c.giriAnno === 1 ? ' gara' : ' gare') + '): CR ' + f1(c.cr) + ' · SR ' + c.sr + ' · par ' + c.par + ', playing HCP ' + scen.ch + '.</p>' +
'<p class="cn">I lordi vanno da 4 colpi sotto a 4 sopra il tuo giro medio: SD medio degli ultimi ' + n20 + ' score <b class="strong">' + f1(scen.sdMed) + '</b>, cioè <b class="strong">' + scen.centro + '</b> lordi su questo campo (riga ●).</p>' +
'<p class="cn">' + frase + '</p></div>' +
'<div class="tw"><table class="scen"><thead><tr><th class="n">Lordo</th><th class="n">Sul par</th><th class="n">Stableford*</th><th class="n hs">SD</th><th class="n">HCP risultante</th><th class="n">Variazione</th></tr></thead><tbody>' +
scen.righe.map(function (r) {
var cls = (r.v < 0 ? 'giu' : r.v > 0 ? 'su' : 'pari') + (r.esr ? ' esr' : '') + (r.centro ? ' centro' : '');
return '<tr class="' + cls + '"><td class="n b">' + r.lordo + (r.centro ? ' ●' : '') + '</td><td class="n">' + fspN(r.sp) + '</td><td class="n">' + r.stb + '</td><td class="n hs">' + fsd(r.sd) + '</td><td class="n b">' + f1(r.hcp) + (r.esr ? ' · ESR −' + r.esr : '') + '</td><td class="n var">' + (r.v === 0 ? 'invariato' : sg(r.v)) + '</td></tr>';
}).join('') + '</tbody></table></div><p class="cn">' + esrTxt + '</p></section>';
}
function htmlSim() {
if (!campi.length || !ult20.length) return '';
var opts = campi.map(function (c, i) { return '<option value="' + i + '">' + esc(c.circolo) + ' · CR ' + f1(c.cr) + ' / SR ' + c.sr + ' / par ' + c.par + ' (' + c.giri + (c.giri === 1 ? ' giro' : ' giri') + ')</option>'; }).join('') + '<option value="altro">Altro campo: inserisci CR, SR e par</option>';
return '<section class="card" id="sim"><div><h2 class="ct">Simulatore HCP</h2><p class="cn">Scegli il campo e scrivi il lordo, o l’SD, delle prossime gare valide: vedi subito come cambia il tuo HCP. La seconda gara è facoltativa.</p></div>' +
'<div class="sim"><div class="sim-f">' +
'<label class="fld"><span class="fl">Campo e tee</span><select class="inp" id="s-campo">' + opts + '</select></label>' +
'<div class="sim-c" id="s-custom" hidden><label class="fld"><span class="fl">Course rating</span><input class="inp" id="s-cr" type="number" inputmode="decimal" step="0.1" placeholder="71.8"></label><label class="fld"><span class="fl">Slope rating</span><input class="inp" id="s-sr" type="number" inputmode="numeric" placeholder="136"></label><label class="fld"><span class="fl">Par</span><input class="inp" id="s-par" type="number" inputmode="numeric" placeholder="72"></label></div>' +
'<div class="fld"><span class="fl">Inserisci</span><div class="seg"><button type="button" class="segb" data-m="lordo" aria-pressed="true">Lordo</button><button type="button" class="segb" data-m="sd" aria-pressed="false">SD</button></div></div>' +
'<div class="sim-g"><label class="fld"><span class="fl">Gara 1</span><input class="inp" id="s-v1" type="number" inputmode="decimal" placeholder="es. 77"></label><label class="fld"><span class="fl">Gara 2 <span class="fo">facoltativa</span></span><input class="inp" id="s-v2" type="number" inputmode="decimal" placeholder="—"></label></div>' +
'</div><div class="sim-o" id="s-out" aria-live="polite"></div></div>' +
'<p class="sim-ft">Gare valide a 18 buche, senza correzione PCC e senza i limiti di crescita WHS (soft e hard cap). Punti Stableford stimati con il playing HCP del momento, se nessuna buca supera il doppio bogey netto.</p></section>';
}
function htmlNote() {
var it = [
['Fonte e aggiornamento', 'Area riservata Federgolf, sezione Risultati, letta dal pulsante "Aggiorna HCP" e salvata solo su questo dispositivo; ultima gara caricata il ' + dIt(ultimo.data) + '. Dopo nuove gare tocca "Aggiorna".'],
['Colpi sul par', 'Media di lordo corretto meno par del campo, sulle gare valide degli ultimi 3 anni (anno in corso compreso). Un giro di 9 buche conta rispetto al suo par.'],
['Media lorda', 'Lordo corretto (AGS) delle sole gare valide a 18 buche.'],
['Gare NR', 'Le gare con risultato NR restano nel conteggio delle gare e nello storico HCP, ma sono escluse dalle medie di lordo, colpi sul par e SD.'],
['Score eccezionali', 'Gli SD degli ultimi 20 giri sono già corretti da eventuali riduzioni per score eccezionale (ESR).'],
['Gare a 9 buche', 'Le gare valide a 9 buche producono un SD su 18 buche secondo le regole WHS.']
];
return '<section class="card"><h2 class="ct">Note sui dati</h2><dl class="notes">' + it.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl></section>';
}
function htmlAnalisi() {
var M = mesiTab, cols = M.anni.map(String).concat(['tot']);
var est = {};
cols.forEach(function (k) {
var ok = M.righe.filter(function (r) { return r.c[k].sd != null && r.c[k].n >= 2; });
if (ok.length >= 2) est[k] = { min: Math.min.apply(null, ok.map(function (r) { return r.c[k].sd; })), max: Math.max.apply(null, ok.map(function (r) { return r.c[k].sd; })) };
});
var mesiH = M.righe.length ? '<div class="tw"><table class="an-t"><thead><tr><th>Mese</th>' + cols.map(function (k) { return '<th class="n' + (k === 'tot' ? ' tot' : '') + '">' + (k === 'tot' ? (M.anni.length > 1 ? 'Media ' + M.anni.length + ' anni' : 'Media') : k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
M.righe.map(function (r) {
return '<tr><td class="b">' + r.mese + '</td>' + cols.map(function (k) {
var c = r.c[k], e = est[k], cl = 'n' + (k === 'tot' ? ' tot' : '');
if (c.sd == null) return '<td class="' + cl + ' vu">—</td>';
if (e && c.n >= 2) { if (c.sd === e.min) cl += ' mb'; else if (c.sd === e.max) cl += ' mw'; }
return '<td class="' + cl + '"><span class="v">' + f1(c.sd) + '</span><span class="nn">(' + c.n + ')</span></td>';
}).join('') + '</tr>';
}).join('') + '</tbody></table></div>' : '<p class="cn">Nessuna gara valida negli ultimi 3 anni.</p>';
var ad = soglie.adattate ? '<p class="an">Con HCP ' + f1(H0) + ' le soglie si adattano al tuo livello: partono dal playing HCP (' + soglie.ch + ') sul campo più giocato e si allargano in proporzione all’handicap.</p>' : '';
return '<section class="page" id="analisi" hidden><div class="an-row">' +
'<section class="card cs"><div><h2 class="ct">SD medio mese per mese</h2><p class="cn">Gare valide, NR escluse; tra parentesi i giri. Verde il mese migliore, rosso il peggiore (almeno 2 giri).</p></div>' + mesiH + '</section>' +
'<section class="card cs"><div><h2 class="ct">Serie consecutive</h2><p class="cn">Giri validi a 18 buche consecutivi sotto la soglia rispetto al par (le 9 buche non contano e non interrompono). Tocca una serie per vedere i giri.</p></div>' +
'<div class="chips" id="se-ch">' + soglie.lista.map(function (s, i) { return '<button class="chip" type="button" data-s="' + s.s + '" aria-pressed="' + (i === 0) + '">' + s.l + '</button>'; }).join('') + '</div>' + ad +
'<div class="an-k"><div class="ak"><span class="lbl">Serie più lunga</span><span class="akv" id="se-max">—</span><span class="sub" id="se-maxs"></span></div><div class="ak"><span class="lbl">Serie in corso</span><span class="akv" id="se-ora">—</span><span class="sub" id="se-oras"></span></div></div>' +
'<div class="tw"><table class="an-t" id="se-t"><thead><tr><th class="n">Giri</th><th>Dal</th><th>Al</th><th class="n">Media sul par</th><th class="n">Miglior lordo</th></tr></thead><tbody></tbody></table></div></section>' +
'</div></section>';
}
function tipAttr(lines) { return ' data-tip="' + esc(lines.join('\n')) + '"'; }
function chartPar(W) {
if (!parAnni.length) return '';
var perRow = Math.max(4, Math.floor(((W - 8) / parAnni.length * 0.8) / 8));
var dotRows = Math.max(1, Math.ceil(Math.max.apply(null, parAnni.map(function (d) { return d.n; })) / perRow));
var mT = 22, mB = 26 + dotRows * 8 + 6, H = 150 + mB;
var maxV = Math.max(Math.max.apply(null, parAnni.map(function (d) { return d.sopra; })), sopraTot || 0, 1);
var step = (W - 8) / parAnni.length, bw = Math.min(76, step * 0.7);
var y = function (v) { return H - mB - (H - mB - mT) * (v / (maxV * 1.12)); };
var best = Math.min.apply(null, parAnni.map(function (d) { return d.sopra; }));
var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Colpi sul par per anno">';
parAnni.forEach(function (d, i) {
var cx = 4 + step * i + step / 2, top = y(Math.max(0, d.sopra)), bot = y(0), isB = d.sopra === best;
s += '<rect x="' + (cx - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + Math.max(1, bot - top) + '" rx="6" class="' + (isB ? 'b-acc' : 'b-mut') + '"' + tipAttr([String(d.anno), sg(d.sopra) + ' colpi sul par per giro', 'SD medio ' + f1(d.sdm) + ' · ' + d.n + ' gare valide']) + '/>';
s += '<text x="' + cx + '" y="' + (top - 6) + '" text-anchor="middle" class="t-strong">' + sg(d.sopra) + '</text>';
if (d.sdm != null) {
var room = bot - top, col = isB ? 't-inv' : 't-strong';
if (room >= 40) { var mid = top + Math.min(room / 2, 34); s += '<text x="' + cx + '" y="' + (mid - 4) + '" text-anchor="middle" class="' + col + ' t-xs">SD medio</text><text x="' + cx + '" y="' + (mid + 13) + '" text-anchor="middle" class="' + col + '">' + f1(d.sdm) + '</text>'; }
else s += '<text x="' + cx + '" y="' + (top + room / 2 + 4) + '" text-anchor="middle" class="' + col + '">' + f1(d.sdm) + '</text>';
}
s += '<text x="' + cx + '" y="' + (H - mB + 15) + '" text-anchor="middle"><tspan class="t-strong">' + d.anno + '</tspan> · ' + d.n + ' gare</text>';
for (var k = 0; k < d.n; k++) {
var rr = Math.floor(k / perRow), c = k % perRow, rc = Math.min(perRow, d.n - rr * perRow);
s += '<circle cx="' + (cx - (rc - 1) * 4 + c * 8) + '" cy="' + (H - mB + 28 + rr * 8) + '" r="2.6" class="dot' + (isB ? '' : ' dot-soft') + '"/>';
}
});
s += '<line x1="4" x2="' + (W - 4) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="axis"/>';
if (sopraTot != null) s += '<line x1="4" x2="' + (W - 4) + '" y1="' + y(sopraTot) + '" y2="' + y(sopraTot) + '" class="ref"/>';
return s + '</svg>';
}
function chartGare(W) {
var data = perAnno.slice().reverse(), H = 280, mT = 60, mB = 42;
data.forEach(function (d) { d.nv = d.gare - d.valide; });
var maxG = Math.max.apply(null, data.map(function (d) { return Math.max(d.nv, d.valide); })) * 1.08 || 1;
var step = (W - 8) / data.length, grp = step * 0.7, bw = Math.min(32, grp / 2 * 0.88);
var y = function (v) { return H - mB - (H - mB - mT) * (v / maxG); };
var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Gare non valide e valide per anno, con il totale">';
data.forEach(function (d, i) {
var cx = 4 + step * i + step / 2, pct = d.gare ? Math.round(d.valide / d.gare * 100) : 0;
[['nv', 'b-mut', 'gare non valide', -1], ['valide', 'b-acc', 'gare valide', 1]].forEach(function (k) {
var x = cx + k[3] * grp / 4 - bw / 2, v = d[k[0]];
s += '<rect x="' + x + '" y="' + y(v) + '" width="' + bw + '" height="' + Math.max(1, y(0) - y(v)) + '" rx="4" class="' + k[1] + '"' + tipAttr([String(d.anno), v + ' ' + k[2], d.valide + ' valide su ' + d.gare + ' giocate (' + pct + '%)']) + '/>';
s += '<text x="' + (x + bw / 2) + '" y="' + (y(v) - 6) + '" text-anchor="middle" class="t-strong">' + v + '</text>';
});
var xa = cx - grp / 4 - bw / 2, xb = cx + grp / 4 + bw / 2, top = Math.min(y(d.nv), y(d.valide)) - 26;
var lab = d.gare + ' gare', pw = Math.max(52, lab.length * 7.2 + 14), ph = 20, py = 6;
s += '<path d="M' + xa + ',' + (top + 6) + 'V' + top + 'H' + xb + 'V' + (top + 6) + 'M' + cx + ',' + top + 'V' + (py + ph) + '" class="cl-ln"/>';
s += '<rect x="' + (cx - pw / 2) + '" y="' + py + '" width="' + pw + '" height="' + ph + '" rx="10" class="cl-box"/>';
s += '<text x="' + cx + '" y="' + (py + 14) + '" text-anchor="middle" class="t-strong">' + lab + '</text>';
s += '<text x="' + cx + '" y="' + (H - mB + 16) + '" text-anchor="middle" class="t-strong">' + d.anno + '</text><text x="' + cx + '" y="' + (H - mB + 31) + '" text-anchor="middle">' + pct + '% valide</text>';
});
return s + '<line x1="4" x2="' + (W - 4) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="axis"/></svg>';
}
function chartSpark(W) {
var data = gare.filter(function (r) { return r.anno === annoMax && r.hcp_dopo != null; });
if (!data.length) return '';
var H = 96, mT = 16, mB = 16, mL = 4, mR = 30;
var base = data[0].hcp_prima != null ? data[0].hcp_prima : data[0].hcp_dopo;
var pts = [{ data: annoMax + '-01-01', hcp: base, gara: 'Inizio ' + annoMax }].concat(data.map(function (d) { return { data: d.data, hcp: d.hcp_dopo, gara: d.gara }; }));
var t0 = Date.UTC(annoMax, 0, 1), t1 = Date.parse(pts[pts.length - 1].data + 'T00:00:00Z'); if (t1 <= t0) t1 = t0 + 864e5;
var vals = pts.map(function (p) { return p.hcp; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = Math.max(0.2, (hi - lo) * 0.15);
var X = function (d) { return mL + (W - mL - mR) * ((Date.parse(d + 'T00:00:00Z') - t0) / (t1 - t0)); };
var Y = function (v) { return H - mB - (H - mB - mT) * ((v - (lo - pad)) / ((hi + pad) - (lo - pad))); };
var yb = Y(base), path = '';
pts.forEach(function (p, i) { var x = X(p.data); path += i ? ' L' + x.toFixed(1) + ' ' + Y(pts[i - 1].hcp).toFixed(1) + ' L' + x.toFixed(1) + ' ' + Y(p.hcp).toFixed(1) : 'M' + x.toFixed(1) + ' ' + Y(p.hcp).toFixed(1); });
var xe = X(pts[pts.length - 1].data).toFixed(1), xs = X(pts[0].data).toFixed(1);
var area = path + ' L' + xe + ' ' + yb + ' L' + xs + ' ' + yb + ' Z';
var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="HCP Index nel ' + annoMax + '">';
s += '<defs><clipPath id="sp-a"><rect x="0" y="0" width="' + W + '" height="' + yb + '"/></clipPath><clipPath id="sp-b"><rect x="0" y="' + yb + '" width="' + W + '" height="' + (H - yb) + '"/></clipPath></defs>';
s += '<path d="' + area + '" class="sp-bad" clip-path="url(#sp-a)"/><path d="' + area + '" class="sp-ok" clip-path="url(#sp-b)"/>';
s += '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + yb + '" y2="' + yb + '" class="ref"/>';
s += '<path d="' + path + '" class="sp-ln"/>';
var last = pts[pts.length - 1];
var maxP = pts.reduce(function (a, p) { return p.hcp >= a.hcp ? p : a; }, pts[0]);
var minP = pts.reduce(function (a, p) { return p.hcp < a.hcp ? p : a; }, pts[0]);
s += '<circle cx="' + X(pts[0].data) + '" cy="' + yb + '" r="2.5" class="sp-dot0"/>';
if (maxP !== last && maxP.hcp > base) s += '<circle cx="' + X(maxP.data) + '" cy="' + Y(maxP.hcp) + '" r="2.5" class="sp-bd"/><text x="' + X(maxP.data) + '" y="' + (Y(maxP.hcp) - 6) + '" text-anchor="middle" class="t-xs">max ' + f1(maxP.hcp) + '</text>';
if (minP !== pts[0] && minP !== last && minP.hcp < base) s += '<circle cx="' + X(minP.data) + '" cy="' + Y(minP.hcp) + '" r="2.5" class="sp-gd"/><text x="' + X(minP.data) + '" y="' + (Y(minP.hcp) + 13) + '" text-anchor="middle" class="t-xs">min ' + f1(minP.hcp) + '</text>';
s += '<circle cx="' + X(last.data) + '" cy="' + Y(last.hcp) + '" r="4" class="' + (last.hcp > base ? 'sp-bd' : last.hcp < base ? 'sp-gd' : 'sp-dot0') + '"/><text x="' + (X(last.data) + 7) + '" y="' + (Y(last.hcp) + 4) + '" class="t-strong">' + f1(last.hcp) + '</text>';
var mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
s += '<text x="' + mL + '" y="' + (H - 3) + '" class="t-xs">gen</text><text x="' + (W - mR) + '" y="' + (H - 3) + '" text-anchor="end" class="t-xs">' + mesi[new Date(t1).getUTCMonth()] + '</text>';
pts.forEach(function (p, i) {
var x0 = i ? (X(pts[i - 1].data) + X(p.data)) / 2 : mL, x1 = i < pts.length - 1 ? (X(p.data) + X(pts[i + 1].data)) / 2 : W - mR;
s += '<rect x="' + x0 + '" y="0" width="' + Math.max(1, x1 - x0) + '" height="' + H + '" fill="transparent"' + tipAttr([dIt(p.data), 'HCP ' + f1(p.hcp), p.gara]) + '/>';
});
return s + '</svg>';
}
function chart20(W) {
var data = ult20.slice().sort(function (a, b) { return a.data.localeCompare(b.data) || a.giro - b.giro; });
if (!data.length) return '';
var H = 260, mT = 18, mB = 26, mL = 28, mR = 8;
var top = Math.ceil(Math.max.apply(null, data.map(function (d) { return d.sd; })) + 1);
var y = function (v) { return H - mB - (H - mB - mT) * (Math.max(0, v) / top); };
var step = (W - mL - mR) / data.length, bw = Math.min(32, step * 0.75);
var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Ultimi 20 score validi">';
var tick = top > 12 ? 5 : 2;
for (var t = 0; t <= top; t += tick) s += '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="grid"/><text x="' + (mL - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>';
var every = Math.max(1, Math.ceil(56 / step));
data.forEach(function (d, i) {
var x = mL + step * i + (step - bw) / 2;
var out = uscente && uscente.id === d.id;
s += '<rect x="' + x + '" y="' + y(d.sd) + '" width="' + bw + '" height="' + Math.max(1, y(0) - y(d.sd)) + '" rx="4" class="' + (d.migliore ? 'b-acc' : 'b-mut') + '"' + tipAttr([dIt(d.data) + ' · ' + d.circolo, d.gara, 'SD ' + f1(d.sd) + (d.migliore ? ' · tra i migliori' : '') + (out ? ' · esce alla prossima gara valida' : '')]) + '/>';
if (out) s += '<rect x="' + (x - 3) + '" y="' + (y(d.sd) - 3) + '" width="' + (bw + 6) + '" height="' + (Math.max(1, y(0) - y(d.sd)) + 3) + '" rx="6" class="outl"/>';
if (i % every === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (H - mB + 16) + '" text-anchor="middle">' + dSh(d.data) + '</text>';
});
s += '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="axis"/>';
if (media8 != null) s += '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(media8) + '" y2="' + y(media8) + '" class="ref"/><text x="' + (W - mR) + '" y="' + (y(media8) - 5) + '" text-anchor="end">media ' + f2(media8) + '</text>';
return s + '</svg>';
}
function chartHcp(W) {
var data = gare.filter(function (r) { return r.anno === annoMax && r.hcp_dopo != null; });
if (!data.length) return '';
var H = 260, mT = 12, mB = 26, mL = 26, mR = 40;
var t0 = Date.UTC(annoMax, 0, 1), t1 = Date.parse(data[data.length - 1].data + 'T00:00:00Z');
if (t1 <= t0) t1 = t0 + 864e5;
var vals = data.map(function (d) { return d.hcp_dopo; }).concat(data.map(function (d) { return d.hcp_prima; })).filter(function (v) { return v != null; });
var lo = Math.max(0, Math.floor(Math.min.apply(null, vals) - 0.5)), hi = Math.ceil(Math.max.apply(null, vals) + 0.5);
var X = function (d) { return mL + (W - mL - mR) * ((Date.parse(d + 'T00:00:00Z') - t0) / (t1 - t0)); };
var Y = function (v) { return H - mB - (H - mB - mT) * ((v - lo) / (hi - lo)); };
var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Andamento handicap">';
s += '<defs><linearGradient id="gh-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="gs1"/><stop offset="1" class="gs2"/></linearGradient></defs>';
var stepV = hi - lo > 6 ? 2 : 1;
for (var v = lo; v <= hi; v += stepV) s += '<line x1="' + mL + '" x2="' + (W - mR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grid"/><text x="' + (mL - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>';
var mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
var lastM = new Date(t1).getUTCMonth(), everyM = W > 520 ? 1 : 2;
for (var m = 0; m <= lastM; m += everyM) {
var dm = annoMax + '-' + String(m + 1).padStart(2, '0') + '-01', xm = X(dm);
if (m) s += '<line x1="' + xm + '" x2="' + xm + '" y1="' + mT + '" y2="' + (H - mB) + '" class="grid"/>';
s += '<text x="' + (xm + 3) + '" y="' + (H - mB + 16) + '">' + mesi[m] + '</text>';
}
var pts = [[X(annoMax + '-01-01'), Y(data[0].hcp_prima != null ? data[0].hcp_prima : data[0].hcp_dopo)]];
data.forEach(function (d) { var x = X(d.data); pts.push([x, pts[pts.length - 1][1]]); pts.push([x, Y(d.hcp_dopo)]); });
var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
s += '<path d="' + line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - mB) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - mB) + ' Z" fill="url(#gh-g)"/>';
s += '<path d="' + line + '" class="ln"/>';
data.forEach(function (d) { if (d.hcp_dopo !== d.hcp_prima) s += '<circle cx="' + X(d.data) + '" cy="' + Y(d.hcp_dopo) + '" r="2.5" class="pt"/>'; });
var last = data[data.length - 1];
s += '<circle cx="' + X(last.data) + '" cy="' + Y(last.hcp_dopo) + '" r="4" class="dot"/><text x="' + (X(last.data) + 8) + '" y="' + (Y(last.hcp_dopo) + 4) + '" class="t-strong">' + f1(last.hcp_dopo) + '</text>';
data.forEach(function (d, i) {
var x0 = i ? (X(data[i - 1].data) + X(d.data)) / 2 : mL, x1 = i < data.length - 1 ? (X(d.data) + X(data[i + 1].data)) / 2 : W - mR;
var vv = d.hcp_dopo - (d.hcp_prima || d.hcp_dopo);
s += '<rect x="' + x0 + '" y="' + mT + '" width="' + Math.max(1, x1 - x0) + '" height="' + (H - mT - mB) + '" fill="transparent"' + tipAttr([dIt(d.data) + ' · ' + d.circolo, d.gara, 'HCP ' + f1(d.hcp_prima) + ' → ' + f1(d.hcp_dopo) + (Math.abs(vv) > 0.04 ? ' (' + sg(r1(vv)) + ')' : ''), isV(d) ? 'SD ' + f1(d.sd) + (d.lordo_ags ? ' · lordo ' + d.lordo_ags : '') : 'Non valida per l’HCP']) + '/>';
});
return s + '</svg>';
}
var css = [
':root{--bg:#f7f6f2;--panel:#fff;--fg:#1f1e1c;--mut:#6d6b66;--line:#e5e2db;--acc:#2f6f4f;--mutbar:#cfccc4;--ok:#2e7d50;--bad:#b5452e;--warn:#c9861a;--inv:#fff}',
'@media (prefers-color-scheme:dark){:root{--bg:#1a1a19;--panel:#242422;--fg:#ecebe6;--mut:#a4a29b;--line:#383734;--acc:#73c095;--mutbar:#4b4a46;--ok:#73c095;--bad:#ea8b73;--warn:#e7b04d;--inv:#10251a}}',
'[hidden]{display:none!important}*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
'.gh{max-width:1180px;margin:0 auto;padding:20px 16px 48px;display:flex;flex-direction:column;gap:18px}.gh h1,.gh h2,.gh p{margin:0}',
'.serif{font-family:Georgia,"Times New Roman",serif;font-weight:400}.ttl{font-size:30px;line-height:1.15}',
'.bar{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:flex-start}.upd{display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-width:24rem}',
'.btn{font:inherit;font-weight:600;border:0;border-radius:99px;padding:8px 16px;background:var(--fg);color:var(--bg);cursor:pointer;text-decoration:none;display:inline-block}.btn.sec{background:transparent;color:var(--fg);border:1px solid var(--line);font-weight:500}',
'.btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.note{font-size:12.5px;color:var(--mut);line-height:1.4}.upd .note{text-align:right}',
'.warn{background:color-mix(in srgb,var(--warn) 14%,transparent);border:1px solid color-mix(in srgb,var(--warn) 45%,transparent);border-radius:10px;padding:10px 12px;font-size:13.5px}',
'.lead{color:var(--mut);max-width:70ch}.lead b{color:var(--fg)}',
'.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;position:sticky;top:0;background:var(--bg);z-index:5}.tab{font:inherit;background:none;border:0;border-bottom:2px solid transparent;color:var(--mut);padding:10px 14px;cursor:pointer;white-space:nowrap;margin-bottom:-1px}.tab[aria-selected=true]{color:var(--fg);border-bottom-color:var(--fg);font-weight:600}',
'.page{display:flex;flex-direction:column;gap:14px}.top{display:grid;grid-template-columns:1fr 1fr 2.2fr;gap:14px}@media(max-width:980px){.top{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}}@media(max-width:560px){.top{grid-template-columns:1fr}}',
'.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}',
'.lbl{font-size:12.5px;color:var(--mut)}.big{font-family:Georgia,serif;font-size:40px;line-height:1.05;font-variant-numeric:tabular-nums}.sub{font-size:12.5px;color:var(--mut);line-height:1.4}.sub b,.strong{color:var(--fg);font-weight:600}',
'.row{display:flex;flex-wrap:wrap;gap:14px}.col{flex:1 1 11rem;min-width:0;display:flex;flex-direction:column;gap:4px}.ch{flex:1.3 1 15rem;min-width:0;position:relative}',
'.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));gap:14px}@media(min-width:1000px){.gridb{grid-template-columns:1fr 1.5fr}}',
'h2.ct{font-size:17px;font-weight:600}.cn{font-size:12.5px;color:var(--mut);line-height:1.45;margin-top:3px!important}',
'.season{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr));gap:14px}.stat{border-left:1px solid var(--line);padding-left:12px;display:flex;flex-direction:column;gap:3px;min-width:0}',
'.sv{font-family:Georgia,serif;font-size:28px;line-height:1.15;font-variant-numeric:tabular-nums}.sv small{font:14px -apple-system,sans-serif;color:var(--mut);margin-left:6px}',
'.good{color:var(--ok)}.bad{color:var(--bad)}',
'.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--mut)}.legend span{display:inline-flex;align-items:center;gap:6px}.sw{width:11px;height:11px;border-radius:2px;display:inline-block}.sw.acc{background:var(--acc)}.sw.mut{background:var(--mutbar)}.sw.out{border:2px solid var(--warn);width:9px;height:9px}.sw.ref{height:0;border-top:2px dashed var(--mut);border-radius:0}',
'.chart{position:relative}svg{display:block;overflow:visible}svg text{fill:var(--mut);font-size:11.5px}svg .t-strong{fill:var(--fg);font-weight:600}svg .t-inv{fill:var(--inv);font-weight:700}svg .t-xs{font-size:10px}',
'svg .b-acc{fill:var(--acc)}svg .b-mut{fill:var(--mutbar)}svg .dot{fill:var(--acc)}svg .dot-soft{fill-opacity:.55}svg .axis{stroke:var(--mut);stroke-opacity:.6}svg .grid{stroke:var(--line)}svg .ref{stroke:var(--mut);stroke-width:1.5;stroke-dasharray:4 3}',
'svg .outl{fill:none;stroke:var(--warn);stroke-width:2}svg .ln{fill:none;stroke:var(--acc);stroke-width:2;stroke-linejoin:round}svg .pt{fill:var(--panel);stroke:var(--acc);stroke-width:1.5}svg .gs1{stop-color:var(--acc);stop-opacity:.25}svg .gs2{stop-color:var(--acc);stop-opacity:0}',
'[data-tip]{cursor:pointer}.tip{position:absolute;pointer-events:none;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.15);padding:6px 9px;font-size:12.5px;line-height:1.45;max-width:16rem;z-index:3}.tip div:first-child{color:var(--mut)}.tip div:nth-child(2){font-weight:600}',
'.out{border-top:1px solid var(--line);padding-top:10px;font-size:13px;line-height:1.5;display:flex;flex-direction:column;gap:4px}.out p{color:var(--mut)}.out b{color:var(--fg)}',
'.tw{overflow:auto;-webkit-overflow-scrolling:touch}.tw.lim{max-height:34rem}table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}td.wr{white-space:normal;min-width:11rem}',
'th{position:sticky;top:0;background:var(--panel);color:var(--mut);font-weight:500;z-index:1}.n{text-align:right}tr.avg td{font-weight:600;border-top:2px solid var(--line);border-bottom:0}tr.best td{background:color-mix(in srgb,var(--ok) 10%,transparent)}tr.nv td{color:var(--mut)}',
'th button{all:unset;cursor:pointer;display:inline-flex;gap:3px}.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;border:1px solid var(--line)}.pill.yes{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 40%,transparent)}',
'.ctrl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{font:inherit;font-size:13px;padding:4px 12px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--fg);cursor:pointer}.chip[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}',
'.srch{font:inherit;font-size:14px;padding:7px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);width:14rem;max-width:100%}.cnt{font-size:12.5px;color:var(--mut)}',
'.foot{font-size:12px;color:var(--mut);line-height:1.5;max-width:80ch}',
'.anti{margin:6px 0 0;padding-top:8px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:4px}.anti .ar{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.anti dt{font-size:12.5px;color:var(--mut)}.anti dd{margin:0;font-size:12.5px;color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}.anti dd b{font-family:Georgia,serif;font-weight:400;font-size:19px;color:var(--fg)}.an{font-size:11.5px;color:var(--mut);line-height:1.4;margin:0}',
'.sp{margin-top:6px;min-height:96px}.sp-leg{display:flex;gap:10px;font-size:11px;color:var(--mut)}.sp-leg span{display:inline-flex;align-items:center;gap:4px}.sw.spb{background:color-mix(in srgb,var(--bad) 35%,transparent)}.sw.spo{background:color-mix(in srgb,var(--ok) 40%,transparent)}',
'svg .sp-bad{fill:var(--bad);fill-opacity:.18}svg .sp-ok{fill:var(--ok);fill-opacity:.22}svg .sp-ln{fill:none;stroke:var(--fg);stroke-width:1.6;stroke-linejoin:round}svg .sp-dot0{fill:var(--mut)}svg .sp-bd{fill:var(--bad)}svg .sp-gd{fill:var(--ok)}svg .cl-box{fill:var(--panel);stroke:var(--mut)}svg .cl-ln{fill:none;stroke:var(--mut)}.sw.pill2{border:1px solid var(--mut);border-radius:99px;background:transparent}',
'table.scen td.b,table.an-t td.b{font-weight:600}table.scen tr.giu td.var{color:var(--ok);font-weight:600}table.scen tr.su td.var{color:var(--bad);font-weight:600}table.scen tr.pari td{color:var(--mut)}table.scen tr.esr td{background:color-mix(in srgb,var(--ok) 12%,transparent)}table.scen tr.centro td{font-weight:600;color:var(--fg);border-top:1px solid var(--mut);border-bottom:1px solid var(--mut)}',
'.sim{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}@media(max-width:760px){.sim{grid-template-columns:minmax(0,1fr)}}.sim-f{display:flex;flex-direction:column;gap:12px;min-width:0}.fld{display:flex;flex-direction:column;gap:6px;min-width:0}.fl{font-size:12.5px;color:var(--mut);font-weight:500}.fo{font-weight:400;opacity:.75}',
'.inp{font:inherit;font-size:16px;height:2.5rem;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);width:100%;min-width:0;font-variant-numeric:tabular-nums}.sim-c{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.sim-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
'.seg{display:grid;grid-template-columns:1fr 1fr;padding:3px;gap:3px;border:1px solid var(--line);border-radius:10px;background:var(--bg);height:2.5rem}.segb{font:inherit;font-size:13px;font-weight:500;border:0;border-radius:8px;background:transparent;color:var(--mut);cursor:pointer}.segb[aria-pressed=true]{background:var(--fg);color:var(--bg)}',
'.sim-o{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:12px}.sim-e{grid-column:1/-1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:9rem;padding:16px;border:1px dashed var(--line);border-radius:10px;font-size:12.5px;color:var(--mut)}.sim-r{display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);min-width:0}',
'.sim-h{display:flex;justify-content:space-between;align-items:center}.badge{font-size:11px;font-weight:600;padding:1px 7px;border-radius:99px;background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok)}.sim-v{display:flex;align-items:baseline;gap:8px}.dl{font-size:13px;font-weight:600}.dl.same{color:var(--mut);font-weight:500}',
'.sim-d{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;padding-top:8px;border-top:1px solid var(--line)}.sim-d div{display:flex;flex-direction:column;gap:1px}.sim-d dt{font-size:11px;color:var(--mut)}.sim-d dd{margin:0;font-size:13px;font-variant-numeric:tabular-nums}.sim-ft{font-size:12.5px;color:var(--mut);padding-top:8px;border-top:1px solid var(--line)}',
'.notes{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}@media(max-width:720px){.notes{grid-template-columns:1fr}}.notes div{display:flex;flex-direction:column;gap:2px;padding-top:8px;border-top:1px solid var(--line)}.notes dt{font-size:12.5px;font-weight:600}.notes dd{margin:0;font-size:12.5px;color:var(--mut);line-height:1.5}',
'.an-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}@media(max-width:900px){.an-row{grid-template-columns:minmax(0,1fr)}}.cs{padding:12px;gap:8px}.cs h2.ct{font-size:15px}',
'table.an-t th,table.an-t td{padding:3px 8px;line-height:1.3}table.an-t th{font-size:11px}table.an-t .nn{margin-left:4px;font-size:10px;color:var(--mut)}table.an-t .v{font-weight:600}table.an-t td.vu{color:var(--mut)}table.an-t td.mb{background:color-mix(in srgb,var(--ok) 14%,transparent)}table.an-t td.mb .v{color:var(--ok)}table.an-t td.mw{background:color-mix(in srgb,var(--bad) 12%,transparent)}table.an-t td.mw .v{color:var(--bad)}table.an-t .tot{border-left:1px solid var(--line)}',
'.an-k{display:flex;flex-wrap:wrap;gap:8px}.ak{display:flex;flex-direction:column;gap:1px;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);flex:1 1 12rem;max-width:20rem}.akv{font-family:Georgia,serif;font-size:20px;line-height:1.1}.ak .sub{font-size:11px}',
'#se-t tr.clk{cursor:pointer}#se-t tr.clk:hover td{background:color-mix(in srgb,var(--fg) 5%,transparent)}#se-t tr.rec td.gi{color:var(--ok)}#se-t tr.live td{background:color-mix(in srgb,var(--ok) 9%,transparent)}.chev{display:inline-block;width:1em;font-size:10px;color:var(--mut)}#se-t tr.det>td{padding:0 8px 8px 26px;white-space:normal;background:color-mix(in srgb,var(--fg) 3%,transparent)}',
'.sub-t{width:100%;border-collapse:collapse;font-size:11px}.sub-t th,.sub-t td{padding:3px 6px;position:static;background:none}.sub-t tr:last-child td{border-bottom:0}',
'@media(max-width:640px){.hs{display:none}.upd{align-items:flex-start;max-width:none}.upd .note{text-align:left}.btns{justify-content:flex-start}.ttl{font-size:26px}.big{font-size:34px}}'
].join('\n');
var ora = new Date(dati.salvato);
var html = '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titolo) + '</title><style>' + css + '</style></head><body><div class="gh" id="gh">' +
'<header class="bar"><div style="display:flex;flex-direction:column;gap:6px;max-width:62rem"><h1 class="serif ttl">' + esc(titolo) + '</h1>' +
'<p class="lead">Nel <b>' + S.anno + '</b> hai giocato <b>' + S.gare + '</b> gare, <b>' + S.valide + '</b> valide per l\'handicap. L\'exact HCP è passato da <b>' + f1(S.hcp_inizio) + '</b> a <b>' + f1(S.hcp_fine) + '</b> (<b class="' + (S.delta < 0 ? 'good' : S.delta > 0 ? 'bad' : '') + '">' + sg(S.delta) + '</b>), con uno score medio di <b>' + f1(S.score) + '</b> a par 72 e un SD medio di <b>' + f2(S.sdm) + '</b>.</p></div>' +
'<div class="upd"><div class="btns"><button class="btn" id="b-agg" type="button">Aggiorna</button><button class="btn sec" id="b-fig" type="button">Torna a Federgolf</button></div><span class="note">Dati al ' + dIt(ultimo.data) + ' · letti il ' + ora.toLocaleDateString('it-IT') + ' alle ' + ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</span></div></header>' +
(avviso ? '<div class="warn">' + esc(avviso) + '</div>' : '') +
'<nav class="tabs" role="tablist"><button class="tab" role="tab" data-t="panoramica" aria-selected="true">Panoramica</button><button class="tab" role="tab" data-t="andamento" aria-selected="false">Andamento</button><button class="tab" role="tab" data-t="gare" aria-selected="false">Tutte le gare</button><button class="tab" role="tab" data-t="analisi" aria-selected="false">Analisi Performance</button></nav>' +
'<section class="page" id="panoramica"><div class="top">' +
'<div class="card"><span class="lbl">HCP Index</span><span class="big">' + f1(S.hcp_fine) + '</span><span class="sub"><b class="' + (S.delta < 0 ? 'good' : S.delta > 0 ? 'bad' : '') + '">' + sg(S.delta) + '</b> da inizio ' + S.anno + ', quando era <b>' + f1(S.hcp_inizio) + '</b></span><div class="chart sp" id="c-spark"></div><div class="sp-leg"><span><i class="sw spb"></i>sopra inizio anno</span><span><i class="sw spo"></i>sotto</span></div></div>' +
'<div class="card"><span class="lbl">Media ' + migliori.length + ' migliori SD</span><span class="big">' + f2(media8) + '</span><span class="sub">sugli ultimi ' + n20 + ' score validi; arrotondata a un decimale è l\'HCP Index</span>' + htmlAnti() + '</div>' +
'<div class="card wide"><div class="row"><div class="col"><span class="lbl">Media colpi sul par ultimi 3 anni (' + (annoMax - 2) + '–' + annoMax + ')</span><span class="big">' + sg(sopraTot) + '</span><span class="sub">media per giro su <b>' + perPar.length + '</b> gare valide: ogni giro conta rispetto al suo par, anche le 9 buche. Dentro ogni colonna l\'SD medio dell\'anno, sotto un pallino per ogni gara valida; la linea tratteggiata è la media</span></div><div class="ch chart" id="c-par"></div></div></div>' +
'</div><div class="grid2 gridb">' +
'<section class="card"><div><h2 class="ct">Gare non valide e gare valide</h2><p class="cn">Per anno, dal ' + DAL_ANNO + '. Le gare non valide sono quelle a coppie o a squadre; sopra ogni anno il totale delle gare giocate.</p></div><div class="legend"><span><i class="sw mut"></i>gare non valide</span><span><i class="sw acc"></i>gare valide</span><span><i class="sw pill2"></i>totale gare giocate</span></div><div class="chart" id="c-gare"></div></section>' +
'<section class="card"><div><h2 class="ct">Ultimi 20 risultati validi</h2><p class="cn">In ordine di data. I più bassi formano l\'HCP Index; con 20 score validi, alla prossima gara valida esce il più vecchio, a sinistra.</p></div><div class="legend"><span><i class="sw acc"></i>' + migliori.length + ' migliori</span><span><i class="sw mut"></i>' + (n20 - migliori.length) + ' altri</span><span><i class="sw out"></i>prossimo uscente</span><span><i class="sw ref"></i>media migliori</span></div><div class="chart" id="c-20"></div><div class="out">' +
(uscente ? '<div>Prossimo uscente: <b>' + dIt(uscente.data) + '</b> · ' + esc(uscente.gara) + ' · SD <b>' + f1(uscente.sd) + '</b></div>'
: '<p>Gli score validi sono ' + n20 + ' su 20: le prossime gare valide si aggiungono senza farne uscire nessuno.</p>') +
'</div></section></div>' + htmlScen() + htmlSim() + htmlNote() + '</section>' +
'<section class="page" id="andamento" hidden><section class="card"><div><h2 class="ct">Stagione ' + S.anno + '</h2><p class="cn">Riepilogo dell\'anno in corso. Lo score medio è la media dei colpi sul par di ogni giro, sommata a 72 per confrontare percorsi con par diversi; le 9 buche contano rispetto al loro par.</p></div><div class="season">' +
'<div class="stat"><span class="lbl">1 · Gare giocate</span><span class="sv">' + S.gare + '</span><span class="sub">incluse quelle non valide</span></div>' +
'<div class="stat"><span class="lbl">2 · Gare valide</span><span class="sv">' + S.valide + '<small>' + (S.perc == null ? '' : S.perc.toFixed(1) + '%') + '</small></span><span class="sub">valide per l\'handicap, sul totale</span></div>' +
'<div class="stat"><span class="lbl">3 · Score medio gare valide</span><span class="sv">' + f1(S.score) + '<small>(' + sg(S.sopra) + ')</small></span><span class="sub">ponderato sul par del campo, a par 72</span></div>' +
'<div class="stat"><span class="lbl">4 · SD medio gare valide</span><span class="sv">' + f2(S.sdm) + '</span><span class="sub">media degli Score Differential</span></div></div></section>' +
'<section class="card"><div><h2 class="ct">Andamento dell\'exact HCP</h2><p class="cn">exact HCP dopo ogni gara dell\'anno in corso, da gennaio a oggi. Tocca o passa sul grafico per vedere la gara e lo score.</p></div><div class="season">' +
'<div class="stat"><span class="lbl">1 · HCP Index attuale</span><span class="sv">' + f1(ultimo.hcp_dopo) + '</span><span class="sub">dopo l\'ultima gara del ' + dIt(ultimo.data) + '</span></div>' +
'<div class="stat"><span class="lbl">2 · HCP Index inizio anno</span><span class="sv">' + f1(S.hcp_inizio) + '</span><span class="sub">al 1° gennaio ' + S.anno + '</span></div>' +
'<div class="stat"><span class="lbl">3 · Variazione da inizio anno</span><span class="sv ' + (S.delta < 0 ? 'good' : S.delta > 0 ? 'bad' : '') + '">' + sg(S.delta) + '</span><span class="sub">rosso se sale, verde se scende</span></div>' +
'<div class="stat"><span class="lbl">4 · HCP Index minimo</span><span class="sv">' + f1(minimo && minimo.hcp_dopo) + '</span><span class="sub">HCP minimo, raggiunto il ' + (minimo ? dIt(minimo.data) + ' · ' + esc(minimo.gara) : '—') + '</span></div>' +
'</div><div class="chart" id="c-hcp"></div></section>' +
'<div class="grid2"><section class="card"><div><h2 class="ct">I migliori ' + migliori.length + ' SD che generano HCP Index</h2><p class="cn">Dal più recente al più vecchio. Quando uno di questi esce dagli ultimi 20, l\'HCP può salire anche senza giocare peggio. Per un giro a 9 buche il lordo è riportato su 18: 72 + SD arrotondato per eccesso.</p></div><div class="tw"><table><thead><tr><th>Data</th><th>Circolo</th><th>Gara</th><th class="n">Lordo</th><th class="n">SD</th></tr></thead><tbody>' +
migliori.map(function (r) { return '<tr><td>' + dIt(r.data) + '</td><td>' + esc(r.circolo) + '</td><td class="wr">' + esc(r.gara) + '</td><td class="n">' + (r.lordo_18 == null ? '—' : r.lordo_18) + '</td><td class="n">' + f1(r.sd) + '</td></tr>'; }).join('') +
'</tbody><tfoot><tr class="avg"><td colspan="3">Media aritmetica</td><td class="n">' + f1(media8lordo) + '</td><td class="n">' + f2(media8sd) + '</td></tr></tfoot></table></div></section>' +
'<section class="card"><div><h2 class="ct">Gli ultimi 20 giri validi</h2><p class="cn">Dal più recente. Evidenziati i migliori, che generano l\'HCP Index; con 20 giri, l\'ultimo della lista è il prossimo a uscire.</p></div><div class="tw"><table><thead><tr><th>Data</th><th>Circolo</th><th>Gara</th><th class="n">SD</th></tr></thead><tbody>' +
ult20.map(function (r) { return '<tr class="' + (r.migliore ? 'best' : '') + '"><td>' + dIt(r.data) + '</td><td>' + esc(r.circolo) + '</td><td class="wr">' + esc(r.gara) + '</td><td class="n">' + f1(r.sd) + '</td></tr>'; }).join('') +
'</tbody></table></div></section></div>' +
'<section class="card"><div><h2 class="ct">Ultimi 3 anni</h2><p class="cn">HCP a inizio e fine anno, variazione, miglior SD, lordo medio (gare valide a 18 buche) e colpi medi sul par per giro.</p></div><div class="tw"><table><thead><tr><th>Anno</th><th class="n">Gare</th><th class="n">Valide</th><th class="n">HCP inizio</th><th class="n">HCP fine</th><th class="n">Var.</th><th class="n">Miglior SD</th><th class="n">Lordo medio</th><th class="n">Sul par</th><th class="n hs">SD medio</th></tr></thead><tbody>' +
perAnno.filter(function (s) { return s.anno >= annoMax - 2; }).map(function (s) { return '<tr><td>' + s.anno + '</td><td class="n">' + s.gare + '</td><td class="n">' + s.valide + '</td><td class="n">' + f1(s.hcp_inizio) + '</td><td class="n">' + f1(s.hcp_fine) + '</td><td class="n ' + (s.delta < 0 ? 'good' : s.delta > 0 ? 'bad' : '') + '">' + sg(s.delta) + '</td><td class="n">' + f1(s.best) + '</td><td class="n">' + f1(s.lordo) + '</td><td class="n">' + sg(s.sopra) + '</td><td class="n hs">' + f1(s.sdm) + '</td></tr>'; }).join('') +
'</tbody></table></div></section></section>' +
'<section class="page" id="gare" hidden><section class="card"><div><h2 class="ct">Tutte le gare</h2><p class="cn">Lordo = score lordo corretto (AGS) usato per il calcolo dell\'SD; nelle gare a coppie o a squadre non c\'è. Le righe in grigio non sono valide per l\'handicap, quelle evidenziate sono tra gli 8 migliori.</p></div>' +
'<div class="ctrl"><div class="chips" id="chips"></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="cnt" id="cnt"></span><input class="srch" id="srch" type="search" placeholder="Cerca gara o circolo"></div></div>' +
'<div class="tw lim"><table id="tg"><thead><tr><th data-s="data">Data</th><th data-s="circolo">Circolo</th><th data-s="gara">Gara</th><th class="hs" data-s="tipo">Formula</th><th data-s="valida">Valida</th><th class="n" data-s="lordo_ags">Lordo</th><th class="n hs" data-s="stableford">Punti Stbl</th><th class="n" data-s="sd">SD</th><th class="n" data-s="hcp_prima">HCP prima</th><th class="n" data-s="hcp_dopo">HCP dopo</th><th class="n" data-s="variazione">Var.</th></tr></thead><tbody></tbody></table></div></section></section>' +
htmlAnalisi() +
'</div></body></html>';
document.open(); document.write(html); document.close();
var D = document;
var tipEl = null;
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
function showTip(el) {
hideTip();
var box = el.closest('.chart'); if (!box) return;
tipEl = D.createElement('div'); tipEl.className = 'tip';
el.getAttribute('data-tip').split('\n').forEach(function (l) { var d = D.createElement('div'); d.textContent = l; tipEl.appendChild(d); });
box.appendChild(tipEl);
var br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
var x = er.left + er.width / 2 - br.left, y = er.top - br.top;
var left = x + 12; if (left + tipEl.offsetWidth > box.clientWidth) left = x - tipEl.offsetWidth - 12; if (left < 0) left = 0;
var top = y - tipEl.offsetHeight - 8; if (top < 0) top = y + 14;
tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
}
D.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); });
D.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t && e.pointerType === 'mouse') hideTip(); });
D.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); else hideTip(); });
var current = 'panoramica';
function drawCharts() {
hideTip();
var w = function (id) { var el = D.getElementById(id); return el && el.offsetParent !== null ? Math.max(260, el.clientWidth) : 0; };
var put = function (id, fn) { var W = w(id); if (W) D.getElementById(id).innerHTML = fn(W); };
if (current === 'panoramica') { put('c-spark', chartSpark); put('c-par', chartPar); put('c-gare', chartGare); put('c-20', chart20); }
if (current === 'andamento') put('c-hcp', chartHcp);
}
D.querySelectorAll('.tab').forEach(function (b) {
b.addEventListener('click', function () {
current = b.getAttribute('data-t');
D.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
D.querySelectorAll('.page').forEach(function (p) { p.hidden = p.id !== current; });
drawCharts();
});
});
var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawCharts, 150); });
D.getElementById('b-fig').addEventListener('click', function () { location.href = GRID; });
D.getElementById('b-agg').addEventListener('click', function () { this.textContent = 'Aggiorno…'; this.disabled = true; main(); });
var st = { anno: 'tutti', q: '', s: 'data', dir: -1 };
var bestIdsAll = bestIds;
function drawGare() {
var chips = D.getElementById('chips');
chips.innerHTML = ['tutti'].concat(anni.map(String)).map(function (a) { return '<button class="chip" type="button" data-a="' + a + '" aria-pressed="' + (st.anno === a) + '">' + (a === 'tutti' ? 'Tutti' : a) + '</button>'; }).join('');
var numeric = ['lordo_ags', 'stableford', 'sd', 'hcp_prima', 'hcp_dopo', 'variazione'];
var rows = gare.filter(function (r) { return (st.anno === 'tutti' || String(r.anno) === st.anno) && (!st.q || (r.gara + ' ' + r.circolo + ' ' + r.tipo).toLowerCase().indexOf(st.q) >= 0); });
rows.sort(function (a, b) {
var k = st.s;
if (numeric.indexOf(k) >= 0) { var av = num(a[k]), bv = num(b[k]); if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1; return (av - bv) * st.dir; }
if (k === 'data') return (a.data.localeCompare(b.data) || a.giro - b.giro) * st.dir;
return String(a[k]).localeCompare(String(b[k]), 'it') * st.dir;
});
D.getElementById('cnt').textContent = rows.length + (rows.length === 1 ? ' gara' : ' gare');
D.querySelectorAll('#tg th[data-s]').forEach(function (th) { var k = th.getAttribute('data-s'); var base = th.getAttribute('data-l') || th.textContent; th.setAttribute('data-l', base); th.innerHTML = '<button type="button">' + esc(base) + (k === st.s ? (st.dir > 0 ? ' ↑' : ' ↓') : '') + '</button>'; });
D.querySelector('#tg tbody').innerHTML = rows.map(function (r) {
var v = r.valida !== 'No', cls = bestIdsAll[r.id] ? 'best' : (!v ? 'nv' : '');
return '<tr class="' + cls + '"><td>' + dIt(r.data) + '</td><td>' + esc(r.circolo) + '</td><td class="wr">' + esc(r.gara) + '</td><td class="hs">' + esc(r.tipo) + '</td><td><span class="pill' + (v ? ' yes' : '') + '">' + esc(r.valida) + '</span></td><td class="n">' + (r.lordo_ags == null ? '—' : r.lordo_ags) + '</td><td class="n hs">' + esc(r.stableford || '—') + '</td><td class="n">' + (v ? f1(r.sd) : '—') + '</td><td class="n">' + f1(r.hcp_prima) + '</td><td class="n">' + f1(r.hcp_dopo) + '</td><td class="n ' + (r.variazione < 0 ? 'good' : r.variazione > 0 ? 'bad' : '') + '">' + (r.variazione == null ? '—' : sg(r.variazione)) + '</td></tr>';
}).join('');
}
D.getElementById('chips').addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b) { st.anno = b.getAttribute('data-a'); drawGare(); } });
D.getElementById('srch').addEventListener('input', function () { st.q = this.value.trim().toLowerCase(); drawGare(); });
D.querySelector('#tg thead').addEventListener('click', function (e) {
var th = e.target.closest('th[data-s]'); if (!th) return;
var k = th.getAttribute('data-s');
if (st.s === k) st.dir = -st.dir; else { st.s = k; st.dir = ['circolo', 'gara', 'tipo', 'valida'].indexOf(k) >= 0 ? 1 : -1; }
drawGare();
});
var simSt = { m: 'lordo' };
function simCalc() {
var out = D.getElementById('s-out'); if (!out) return;
var sel = D.getElementById('s-campo').value, c;
var msg = function (t) { out.innerHTML = '<p class="sim-e">' + esc(t) + '</p>'; };
if (sel === 'altro') {
var cr = parseFloat(D.getElementById('s-cr').value), sr = parseFloat(D.getElementById('s-sr').value), par = parseFloat(D.getElementById('s-par').value);
if (!(cr > 50 && cr < 85 && sr >= 55 && sr <= 155 && par >= 54 && par <= 80)) return msg('Inserisci course rating, slope rating e par del campo.');
c = { cr: cr, sr: sr, par: par };
} else c = campi[Number(sel)];
var vals = ['s-v1', 's-v2'].map(function (id) { var v = D.getElementById(id).value; return v === '' ? null : parseFloat(String(v).replace(',', '.')); });
if (vals[0] == null || isNaN(vals[0])) return msg(simSt.m === 'lordo' ? 'Scrivi il lordo della gara 1 per vedere il risultato.' : 'Scrivi l’SD della gara 1 per vedere il risultato.');
var okV = function (v) { return simSt.m === 'lordo' ? v >= 40 && v <= 160 : v >= -20 && v <= 60; };
if (!okV(vals[0]) || (vals[1] != null && (isNaN(vals[1]) || !okV(vals[1])))) return msg(simSt.m === 'lordo' ? 'Il lordo deve essere tra 40 e 160.' : 'L’SD deve essere tra −20 e 60.');
var win = ult20Asc.map(function (r) { return { data: r.data, sd: r.sd }; }), h = H0, html = '';
vals.forEach(function (v, i) {
if (v == null) return;
var sd = simSt.m === 'lordo' ? Math.round((113 / c.sr) * (Math.round(v) - c.cr) * 10) / 10 : Math.round(v * 10) / 10;
var lordo = simSt.m === 'lordo' ? Math.round(v) : Math.round(sd * c.sr / 113 + c.cr);
var ch = Math.round(h * c.sr / 113 + c.cr - c.par), stb = 36 + ch - (lordo - c.par);
var r = simGara(win, h, sd), dl = r1(r.hi - h);
html += '<div class="sim-r"><div class="sim-h"><span class="lbl">Dopo la gara ' + (i + 1) + '</span>' + (r.esr ? '<span class="badge">ESR −' + r.esr + '</span>' : '') + '</div>' +
'<div class="sim-v"><span class="big">' + f1(r.hi) + '</span><span class="dl ' + (dl < 0 ? 'good' : dl > 0 ? 'bad' : 'same') + '">' + (dl === 0 ? 'invariato' : sg(dl)) + '</span></div>' +
'<dl class="sim-d"><div><dt>Lordo</dt><dd>' + (simSt.m === 'sd' ? '≈ ' : '') + lordo + ' (' + fspN(lordo - c.par) + ')</dd></div><div><dt>SD</dt><dd>' + fsd(sd) + '</dd></div><div><dt>Stableford</dt><dd>≈ ' + stb + ' punti</dd></div><div><dt>Esce</dt><dd>' + (r.esce ? 'SD ' + f1(r.esce.sd) + ' del ' + dIt(r.esce.data) : 'nessuno') + '</dd></div></dl></div>';
win = r.w; h = r.hi;
});
out.innerHTML = html;
}
if (D.getElementById('sim')) {
D.getElementById('s-campo').addEventListener('change', function () { D.getElementById('s-custom').hidden = this.value !== 'altro'; simCalc(); });
['s-cr', 's-sr', 's-par', 's-v1', 's-v2'].forEach(function (id) { D.getElementById(id).addEventListener('input', simCalc); });
D.querySelectorAll('.segb').forEach(function (b) { b.addEventListener('click', function () {
simSt.m = b.getAttribute('data-m');
D.querySelectorAll('.segb').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
D.getElementById('s-v1').placeholder = simSt.m === 'lordo' ? 'es. 77' : 'es. 4.3';
simCalc();
}); });
simCalc();
}
var seSt = { s: soglie.lista[0].s, open: {} };
function drawSerie() {
var tb = D.querySelector('#se-t tbody'); if (!tb) return;
var sgo = soglie.lista.filter(function (x) { return x.s === seSt.s; })[0], nome = sgo ? sgo.l : '';
var rows = serie[seSt.s] || [], max = rows.length ? rows[0].giri : 0, quante = rows.filter(function (r) { return r.giri === max; }).length;
var g = function (n) { return n + (n === 1 ? ' giro' : ' giri'); };
D.getElementById('se-max').textContent = max ? g(max) : 'nessuna';
D.getElementById('se-maxs').textContent = max ? (quante > 1 ? 'raggiunta ' + quante + ' volte' : 'dal ' + rows[0].dal + ' al ' + rows[0].al) : 'nessun giro ' + nome + ' finora';
var ora = rows.filter(function (r) { return r.inCorso; })[0];
D.getElementById('se-ora').textContent = ora ? g(ora.giri) : '0 giri';
D.getElementById('se-oras').textContent = !max ? '' : ora ? (ora.giri === max ? 'eguaglia il record: un altro giro ' + nome + ' e lo batti' : 'ne mancano ' + (max - ora.giri + 1) + ' per battere il record') : 'l’ultimo giro non era ' + nome;
var lunghe = rows.filter(function (r) { return r.giri >= (max >= 2 ? 2 : 1); });
if (!lunghe.length) { tb.innerHTML = '<tr><td colspan="5" class="vu">' + (max ? 'Nessuna serie di almeno 2 giri ' + nome + '.' : 'Nessun giro ' + nome + ' finora.') + '</td></tr>'; return; }
tb.innerHTML = lunghe.map(function (r) {
var ap = !!seSt.open[r.key];
var s = '<tr class="clk' + (r.inCorso ? ' live' : '') + (r.giri === max ? ' rec' : '') + '" data-k="' + esc(r.key) + '" tabindex="0" role="button" aria-expanded="' + ap + '"><td class="n b gi"><span class="chev">' + (ap ? '▾' : '▸') + '</span> ' + r.giri + '</td><td>' + r.dal + '</td><td>' + r.al + (r.inCorso ? ' <span class="badge">in corso</span>' : '') + '</td><td class="n">' + sg(r.media) + '</td><td class="n">' + r.miglior + '</td></tr>';
if (ap) s += '<tr class="det"><td colspan="5"><table class="sub-t"><thead><tr><th>Data</th><th>Campo</th><th class="n">Lordo</th><th class="n">Sul par</th><th class="n">SD</th></tr></thead><tbody>' +
r.det.map(function (d) { return '<tr><td>' + d.data + '</td><td>' + esc(d.circolo) + '</td><td class="n">' + d.lordo + '</td><td class="n">' + d.sp + '</td><td class="n">' + fsd(d.sd) + '</td></tr>'; }).join('') + '</tbody></table></td></tr>';
return s;
}).join('');
}
if (D.getElementById('se-t')) {
D.getElementById('se-ch').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; seSt.s = Number(b.getAttribute('data-s')); D.querySelectorAll('#se-ch .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); drawSerie(); });
var tgl = function (tr) { var k = tr.getAttribute('data-k'); seSt.open[k] = !seSt.open[k]; drawSerie(); };
D.querySelector('#se-t tbody').addEventListener('click', function (e) { var tr = e.target.closest('tr.clk'); if (tr) tgl(tr); });
D.querySelector('#se-t tbody').addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var tr = e.target.closest('tr.clk'); if (tr) { e.preventDefault(); tgl(tr); } });
drawSerie();
}
drawGare();
drawCharts();
if (window.__HCP_TEST) window.__HCP_RES = { titolo: titolo, S: S, media8: media8, sopraTot: sopraTot, n20: n20, uscente: uscente && { d: uscente.data, sd: uscente.sd, soglia: uscente.soglia, best: uscente.migliore }, minimo: minimo && [minimo.hcp_dopo, minimo.data], anni: perAnno.map(function (s) { return [s.anno, s.gare, s.valide, s.sopra, s.lordo, s.best]; }), parAnni: parAnni, anti: anti, scen: scen && scen.righe.map(function (r) { return [r.lordo, r.hcp, r.esr]; }), soglie: soglie, serie: Object.keys(serie).map(function (k) { return [k, serie[k].length ? serie[k][0].giri : 0]; }), mesi: mesiTab.righe.length };
}
})();