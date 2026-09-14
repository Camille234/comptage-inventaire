/**
 * Comptage d'inventaire Shop Santé — pont entre les tablettes et ce Google Sheet.
 *
 * À déployer comme « Application web » :
 *   Exécuter en tant que : Moi
 *   Qui a accès        : Tout le monde
 * L'URL qui se termine par /exec est celle à donner à la page de comptage.
 */

var SHEET = 'Comptages';
var HEAD = ['ID', 'Marque', 'Catégorie', 'Produit', 'Saveur',
            'Rangée', 'Section', 'Tablette', 'Emplacement',
            'Quantité comptée', 'Détail du comptage',
            'Numéro de lot', 'Date d\'expiration', 'Statut', 'Compté par',
            'Dernière mise à jour', 'Référence sept.', 'Écart', 'Note', '_data'];
var COL_DATA = HEAD.length;   // dernière colonne : JSON technique (ne pas modifier à la main)

/* ------------------------------------------------------------------ */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) sh = ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD])
      .setFontWeight('bold').setBackground('#DFEAED');
    sh.setFrozenRows(1);
    sh.hideColumns(COL_DATA);
  }
  return sh;
}

function index_(sh) {
  var n = sh.getLastRow() - 1;
  var map = {};
  if (n <= 0) return map;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i][0] || '');
    if (id) map[id] = i + 2;          // numéro de ligne
  }
  return map;
}

function nz_(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

function total_(rec) {
  if (!rec) return null;
  if (rec.zero) return 0;
  if (!rec.blocs || !rec.blocs.length) return null;
  var t = 0;
  for (var i = 0; i < rec.blocs.length; i++) {
    var b = rec.blocs[i];
    t += nz_(b.c) * nz_(b.u) + nz_(b.r);
  }
  return t;
}

function detail_(rec) {
  var out = [];
  var blocs = (rec && rec.blocs) || [];
  for (var i = 0; i < blocs.length; i++) {
    var b = blocs[i];
    if (nz_(b.c) && nz_(b.u)) {
      out.push(nz_(b.c) + 'x' + nz_(b.u) + (nz_(b.r) ? '+' + nz_(b.r) : ''));
    } else {
      out.push(String(nz_(b.c) * nz_(b.u) + nz_(b.r)));
    }
  }
  return out.join(' + ');
}

function row_(id, rec, meta) {
  rec = rec || {};
  meta = meta || {};
  var tot = total_(rec);
  var compte = rec.zero || (rec.blocs && rec.blocs.length);
  var statut = !compte ? 'Non compté' : (rec.flag ? 'À vérifier' : 'Compté');
  var ref = (meta.ref === null || meta.ref === undefined) ? '' : meta.ref;
  var ecart = (tot !== null && ref !== '') ? (tot - ref) : '';
  var empl = rec.rang ? ('R' + rec.rang + ' · S' + rec.sect + (rec.tabl ? ' · ' + rec.tabl : '')) : '';
  return [
    id, meta.marque || '', meta.cat || '', meta.produit || '', meta.saveur || '',
    rec.rang || '', rec.sect || '', rec.tabl || '', empl,
    tot === null ? '' : tot, detail_(rec),
    rec.lot || '', rec.exp || '', statut, rec.par || '',
    rec.maj ? String(rec.maj).slice(0, 19).replace('T', ' ') : '',
    ref, ecart, rec.note || '',
    JSON.stringify(rec)
  ];
}

/* ------------------------------------------------------------------ */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'all';
  if (action === 'ping') return json_({ ok: true, pong: new Date().toISOString() });
  var sh = sheet_();
  var rows = {};
  var n = sh.getLastRow() - 1;
  if (n > 0) {
    var vals = sh.getRange(2, 1, n, HEAD.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      var id = String(vals[i][0] || '');
      var raw = vals[i][COL_DATA - 1];
      if (!id || !raw) continue;
      try { rows[id] = JSON.parse(raw); } catch (err) { /* ligne modifiée à la main */ }
    }
  }
  return json_({ ok: true, rows: rows });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'json' });
  }
  var rows = body.rows || [];
  if (!rows.length) return json_({ ok: true, saved: 0 });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, error: 'busy' }); }

  try {
    var sh = sheet_();
    var map = index_(sh);
    var appends = [], appendAt = {};
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.id) continue;
      var line = row_(r.id, r.rec, r.meta);
      if (map[r.id]) {
        sh.getRange(map[r.id], 1, 1, HEAD.length).setValues([line]);
      } else if (appendAt[r.id] !== undefined) {
        appends[appendAt[r.id]] = line;          // même produit deux fois dans le lot
      } else {
        appendAt[r.id] = appends.length;
        appends.push(line);
      }
    }
    if (appends.length) {
      sh.getRange(sh.getLastRow() + 1, 1, appends.length, HEAD.length).setValues(appends);
    }
    return json_({ ok: true, saved: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
