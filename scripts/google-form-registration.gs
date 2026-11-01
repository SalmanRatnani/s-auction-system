/**
 * S Auction System — Google Form → Supabase
 *
 * Google Form questions:
 *   Full Name (required)
 *   Final Category (required)
 *   Player Photo (tryout photo) (OPTIONAL file upload, maximum one image)
 *
 * To use:
 *   1. Set REGISTRATION_WEBHOOK_SECRET in Apps Script > Project Settings > Script Properties.
 *      It must match the secret configured in the Vercel production environment.
 *   2. Add an installable trigger: onFormSubmit → From form → On form submit.
 *
 * This handles NEW submissions. Older responses require separate reconciliation.
 */

const BASE_URL = "https://s-auction-system.vercel.app";

const ALLOWED_CATEGORIES = new Set([
  "A+", "A1", "A2", "A3",
  "B1", "B2", "B3", "B4", "B5",
  "C1", "C2", "C3", "C4",
  "K1", "K2", "W1", "W2", "G1"
]);

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function onFormSubmit(e) {
  if (!e || !e.response) {
    throw new Error("Run through a Google Form submission trigger.");
  }

  const response = e.response;
  const responseId = response.getId();
  if (!responseId) throw new Error("Missing Google Form response ID");

  const data = {};
  let photoId = null;

  response.getItemResponses().forEach(itemResponse => {
    const item = itemResponse.getItem();
    const title = item.getTitle().trim().toLowerCase();
    const itemType = String(item.getType());
    const answer = itemResponse.getResponse();

    if (title === "full name") {
      data.name = String(answer || "").trim();
    } else if (title === "final category") {
      data.finalCategory = String(answer || "").trim().toUpperCase();
    }

    // Google Form file uploads can appear under a different question title.
    // Missing optional answers may be omitted from getItemResponses() entirely.
    if (itemType === "FILE_UPLOAD" || /photo|tryout|image/.test(title)) {
      const value = Array.isArray(answer) ? answer[0] : answer;
      if (value) photoId = extractFileId(value);
    }
  });

  if (!data.name || data.name.length > 200) {
    throw new Error("Full Name is required (maximum 200 characters).");
  }
  if (!ALLOWED_CATEGORIES.has(data.finalCategory)) {
    throw new Error("Invalid or missing Final Category: " + String(data.finalCategory || ""));
  }

  const filePaths = {};

  // Photo is OPTIONAL. Skip Storage upload completely when not supplied.
  if (photoId) {
    const blob = DriveApp.getFileById(photoId).getBlob();
    const mimeType = blob.getContentType().toLowerCase();

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error("Tryout photo must be JPEG, PNG or WebP.");
    }
    if (blob.getSize() === 0 || blob.getSize() > MAX_IMAGE_BYTES) {
      throw new Error("Tryout photo must be non-empty and at most 5 MB.");
    }

    const uploadResponse = postSigned(
      BASE_URL + "/api/upload-url",
      JSON.stringify({
        responseId,
        files: [{ kind: "image", name: "image", mimeType }]
      })
    );
    const uploads = JSON.parse(uploadResponse.getContentText()).uploads;
    const upload = uploads && uploads[0];
    if (!upload || !upload.signedUrl || !upload.bucket || !upload.path) {
      throw new Error("Supabase did not return a valid signed photo upload URL.");
    }

    const putResponse = UrlFetchApp.fetch(upload.signedUrl, {
      method: "put",
      contentType: mimeType,
      payload: blob.getBytes(),
      muteHttpExceptions: true
    });

    const putStatus = putResponse.getResponseCode();
    if (putStatus < 200 || putStatus >= 300) {
      throw new Error(
        "Photo upload failed (" + putStatus + "): " + putResponse.getContentText()
      );
    }

    filePaths.image = { bucket: upload.bucket, path: upload.path };
    console.log("Tryout photo uploaded");
  } else {
    console.log("No tryout photo supplied; continuing without a photo");
  }

  const registrationResponse = postSigned(
    BASE_URL + "/api/webhook/register",
    JSON.stringify({
      responseId,
      submittedAt: response.getTimestamp().toISOString(),
      data,
      filePaths
    })
  );

  const result = JSON.parse(registrationResponse.getContentText());
  if (!result.ok) throw new Error("Registration was not confirmed");

  console.log("Registration saved: " + data.name + " (" + data.finalCategory + ")");
  console.log("Photo included: " + Boolean(filePaths.image));
  console.log("Already registered: " + Boolean(result.duplicate));
}

function postSigned(url, payload) {
  const secret = PropertiesService.getScriptProperties()
    .getProperty("REGISTRATION_WEBHOOK_SECRET");
  if (!secret) throw new Error("Set REGISTRATION_WEBHOOK_SECRET in Script Properties.");

  const bytes = Utilities.newBlob(payload, "application/json").getBytes();
  const keyBytes = Utilities.newBlob(secret).getBytes();
  const sig = Utilities.computeHmacSha256Signature(bytes, keyBytes);
  const signature = sig.map(b => ("0" + (b & 255).toString(16)).slice(-2)).join("");

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Signature": signature },
    payload: bytes,
    muteHttpExceptions: true,
    followRedirects: false
  });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) {
    throw new Error(
      "API request failed (" + res.getResponseCode() + "): " + res.getContentText()
    );
  }
  return res;
}

function extractFileId(value) {
  const str = String(value).trim();
  if (/^[A-Za-z0-9_-]{25,}$/.test(str)) return str;
  const match = str.match(/[-\\w]{25,}/);
  return match ? match[0] : null;
}
