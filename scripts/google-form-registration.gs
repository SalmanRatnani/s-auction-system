/**
 * S Auction System — Google Form → Supabase.
 * Required Google Form questions (exact titles):
 *  - Full Name (short answer)
 *  - Final Category (dropdown, match auction categories)
 *  - Player Photo (tryout photo) (file upload; one image)
 *
 * Set REGISTRATION_WEBHOOK_SECRET in Apps Script > Project Settings > Script Properties.
 * Add installable trigger: onFormSubmit / From form / On form submit.
 */
const BASE_URL = "https://s-auction-system.vercel.app";
const ALLOWED_CATEGORIES = new Set([
  "A+", "A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5",
  "C1", "C2", "C3", "C4", "K1", "K2", "W1", "W2", "G1"
]);

function onFormSubmit(e) {
  if (!e || !e.response) throw new Error("Run from a Form Submit trigger, not manually.");
  const response = e.response;
  const responseId = response.getId();
  const data = {};
  let photoId = null;

  response.getItemResponses().forEach(item => {
    const title = item.getItem().getTitle().trim().toLowerCase();
    const answer = item.getResponse();
    if (title === "full name") data.name = String(answer || "").trim();
    if (title === "final category") data.finalCategory = String(answer || "").trim().toUpperCase();
    if (title === "player photo (tryout photo)") {
      // Google Form file-upload responses contain Drive file IDs.
      const value = Array.isArray(answer) ? answer[0] : answer;
      photoId = value ? extractFileId(value) : null;
    }
  });

  if (!data.name || data.name.length > 200) throw new Error("Full Name is required (max 200 characters).");
  if (!ALLOWED_CATEGORIES.has(data.finalCategory)) throw new Error("Invalid Final Category: " + data.finalCategory);
  if (!photoId) throw new Error("Player Photo (tryout photo) is required.");

  const blob = DriveApp.getFileById(photoId).getBlob();
  const mimeType = blob.getContentType().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType))
    throw new Error("Tryout photo must be JPEG, PNG, or WebP.");

  const uploadResponse = postSigned(BASE_URL + "/api/upload-url", JSON.stringify({
    responseId,
    files: [{ kind: "image", name: "image", mimeType }]
  }));
  const upload = JSON.parse(uploadResponse.getContentText()).uploads[0];

  // Signed upload URLs are short lived. Upload immediately.
  const put = UrlFetchApp.fetch(upload.signedUrl, {
    method: "put",
    contentType: mimeType,
    payload: blob.getBytes(),
    muteHttpExceptions: true
  });
  if (put.getResponseCode() < 200 || put.getResponseCode() >= 300)
    throw new Error("Photo upload failed (" + put.getResponseCode() + "): " + put.getContentText());

  const registered = postSigned(BASE_URL + "/api/webhook/register", JSON.stringify({
    responseId,
    submittedAt: response.getTimestamp().toISOString(),
    data,
    filePaths: { image: { bucket: upload.bucket, path: upload.path } }
  }));
  console.log("Registered " + data.name + " (" + data.finalCategory + "): " + registered.getContentText());
}

function postSigned(url, payload) {
  const secret = PropertiesService.getScriptProperties().getProperty("REGISTRATION_WEBHOOK_SECRET");
  if (!secret) throw new Error("Set REGISTRATION_WEBHOOK_SECRET in Script Properties.");
  const bytes = Utilities.newBlob(payload, "application/json").getBytes();
  const sig = Utilities.computeHmacSha256Signature(bytes, Utilities.newBlob(secret).getBytes());
  const hex = sig.map(b => ("0" + (b & 255).toString(16)).slice(-2)).join("");
  const res = UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    headers: { "X-Signature": hex },
    payload: bytes, muteHttpExceptions: true, followRedirects: false
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300)
    throw new Error(url + " failed (" + res.getResponseCode() + "): " + res.getContentText());
  return res;
}

function extractFileId(value) {
  const str = String(value);
  if (/^[A-Za-z0-9_-]{25,}$/.test(str)) return str;
  const match = str.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}
