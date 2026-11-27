// ============================================================================
// جامعہ مخزن العلوم بونستان پنجگور — آن لائن داخلہ فارم (Google Apps Script)
// ============================================================================
// یہ ایک STANDALONE اسکرپٹ ہے (شیٹ سے بندھا ہوا نہیں) — شیٹ ID سے کھولی جاتی ہے۔
// وجہ: 2026-11-22 کو شیٹ سے بندھا ہوا اسکرپٹ ایڈیٹر براؤزر میں نہیں کھلا
// ("Sorry, unable to open the file at this time")، جبکہ standalone پروجیکٹ
// اسی اکاؤنٹ پر فوراً کھل گیا تھا۔
// سیٹ اپ (ایک بار):
//   1) script.google.com کھولیں (muslemalli123@gmail.com) — New project
//   2) Code.gs میں یہ پورا کوڈ چسپاں کریں اور Save کریں
//   3) Project Settings میں Time zone = Asia/Karachi رکھیں
//   4) Deploy > New deployment > Web app — Execute as: Me، Who has access: Anyone
//   5) ملنے والا Web app URL ویب سائٹ کے index.html میں ADM_ENDPOINT میں ڈالیں
// نوٹ: شیٹ خود Private رہتی ہے — صرف یہ اسکرپٹ پڑھتا/لکھتا ہے۔
// TOKEN ویب سائٹ کے ADM_TOKEN سے ملنا چاہیے (index.html میں دیکھیں)۔
// ای میل: قبول/مسترد پر طالب علم کو خودکار ای میل جاتی ہے (MailApp) —
// اس کے لیے اسکرپٹ کو Gmail بھیجنے کی اجازت (scope) درکار ہے۔
/// ============================================================================

var SHEET_ID = "1Tiu5O6J4PlJzLaQIBwh6VtT0yf2kpzwTN6R1iUim47g";
var SHEET_NAME = "درخواستیں";
var TOKEN = "jamia-admin-2026";

var HEADERS = [
  "ٹریکنگ نمبر", "تاریخ و وقت", "طالب علم کا نام", "والد کا نام",
  "تاریخ پیدائش", "عمر", "پتہ", "تحصیل / ضلع", "موبائل", "واٹس ایپ",
  "ای میل", "سابقہ تعلیم", "مطلوبہ درجہ", "حافظ قرآن", "ہاسٹل",
  "حیثیت", "نوٹ", "جنس", "قومیت"
];

function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  }
  return sh;
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ای میل جانچنے کے لیے (ایڈیٹر سے Run کریں — پہلی بار اجازت مانگے گا)
function testMail() {
  MailApp.sendEmail("muslemalli123@gmail.com", "جامعہ داخلہ فارم — ای میل جانچ", "یہ جامعہ کے داخلہ فارم کی ای میل جانچ ہے۔ اگر یہ ای میل ملی ہے تو خودکار ای میل کام کر رہی ہے۔");
}

// قبول/مسترد پر طالب علم کو خودکار ای میل (ای میل موجود ہو تو)
function sendMail_(email, status, r) {
  try {
    if (!email || String(email).indexOf("@") < 0) return false;
    var subj, body;
    if (status === "قبول") {
      subj = "جامعہ مخزن العلوم بونستان پنجگور — آپ کا داخلہ کنفرم ہو گیا ہے";
      body = "السلام علیکم " + r.name + "!\n\n"
        + "جامعہ مخزن العلوم بونستان پنجگور میں آپ کی داخلہ درخواست قبول کر لی گئی ہے — آپ کا داخلہ کنفرم ہو گیا ہے۔\n"
        + "مطلوبہ درجہ: " + r.darja + "\n"
        + "ٹریکنگ نمبر: " + r.tracking + "\n\n"
        + "مزید معلومات کے لیے جامعہ سے رابطہ کریں۔\n"
        + "جامعہ مخزن العلوم بونستان پنجگور — بونستان، پنجگور، بلوچستان";
    } else {
      subj = "جامعہ مخزن العلوم بونستان پنجگور — آپ کی داخلہ درخواست";
      body = "السلام علیکم " + r.name + "!\n\n"
        + "جامعہ مخزن العلوم بونستان پنجگور میں آپ کی داخلہ درخواست (ٹریکنگ نمبر: " + r.tracking + "، مطلوبہ درجہ: " + r.darja + ") پر غور کے بعد اسے مسترد کر دیا گیا ہے۔\n"
        + "وجہ: " + (r.note || "—") + "\n\n"
        + "جامعہ مخزن العلوم بونستان پنجگور — بونستان، پنجگور، بلوچستان";
    }
    MailApp.sendEmail(String(email).trim(), subj, body);
    return true;
  } catch (e) { return false; }
}

// نئی درخواست جمع کرنا / حیثیت بدلنا / حذف کرنا
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents || "{}");
    if (d.token !== TOKEN) return out_({ ok: false, error: "bad token" });
    var sh = sheet_();

    if (d.action === "submit") {
      // موبائل/واٹس ایپ اور تاریخ پیدائش کو ٹیکسٹ کے طور پر لکھیں تاکہ شیٹ
      // موبائل کا شروع والا 0 نہ کھائے اور تاریخ ویسے کی ویسے رہے
      var dob = d.dob ? "'" + String(d.dob) : "";
      var mob = d.mobile ? "'" + String(d.mobile) : "";
      var wa = d.whatsapp ? "'" + String(d.whatsapp) : "";
      // نئے کالم R=18 (جنس) اور S=19 (قومیت) کے ہیڈر — خالی ہوں تو لکھیں
      if (!sh.getRange(1, 18).getValue()) sh.getRange(1, 18).setValue("جنس");
      if (!sh.getRange(1, 19).getValue()) sh.getRange(1, 19).setValue("قومیت");
      sh.appendRow([
        d.tracking, d.datetime, d.name, d.father, dob, d.age,
        d.address, d.district, mob, wa, d.email || "", d.prevEdu,
        d.darja, d.hafiz, d.hostel, "زیر غور", "",
        d.gender || "", d.qaumiyat || ""
      ]);
      return out_({ ok: true, tracking: d.tracking });
    }

    if (d.action === "status") {
      var row = findRow_(sh, d.tracking);
      if (!row) return out_({ ok: false, error: "not found" });
      // حیثیت کالم P = 16، نوٹ (مسترد کی وجہ) کالم Q = 17
      sh.getRange(row, 16).setValue(d.status);
      if (d.note !== undefined) sh.getRange(row, 17).setValue(d.note);
      var rv = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
      var emailed = sendMail_(rv[10], d.status, {
        name: rv[2], darja: rv[12], tracking: rv[0],
        note: (d.note !== undefined ? d.note : rv[16])
      });
      return out_({ ok: true, emailed: emailed });
    }

    if (d.action === "delete") {
      var row2 = findRow_(sh, d.tracking);
      if (!row2) return out_({ ok: false, error: "not found" });
      sh.deleteRow(row2);
      return out_({ ok: true });
    }

    return out_({ ok: false, error: "unknown action" });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// انتظامیہ کے لیے تمام درخواستیں (JSON)
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};

    // طلبہ کے لیے حیثیت معلوم کرنا — ٹوکن کے بغیر، صرف ٹریکنگ نمبر سے؛
    // جواب میں صرف نام، درجہ، حیثیت، وجہ اور تاریخ ہوتی ہے (موبائل/پتہ/ای میل نہیں)
    if (p.action === "status" && p.tracking) {
      var sh0 = sheet_();
      var row0 = findRow_(sh0, String(p.tracking).trim());
      if (!row0) return out_({ ok: false, error: "not found" });
      var v = sh0.getRange(row0, 1, 1, HEADERS.length).getValues()[0];
      return out_({ ok: true, name: v[2], darja: v[12], status: v[15] || "زیر غور", note: v[16], datetime: v[1] });
    }

    if (p.token !== TOKEN) return out_({ ok: false, error: "bad token" });
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return out_({ ok: true, rows: [] });
    var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    var rows = vals.map(function (r) {
      return {
        tracking: r[0], datetime: r[1], name: r[2], father: r[3],
        dob: r[4], age: r[5], address: r[6], district: r[7],
        mobile: r[8], whatsapp: r[9], email: r[10], prevEdu: r[11], darja: r[12],
        hafiz: r[13], hostel: r[14], status: r[15] || "زیر غور", note: r[16],
        gender: r[17], qaumiyat: r[18]
      };
    });
    return out_({ ok: true, rows: rows });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// ٹریکنگ نمبر سے قطار تلاش کرنا (کالم A)
function findRow_(sh, tracking) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(tracking)) return i + 2;
  }
  return 0;
}
