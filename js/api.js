const FS_BASE = "https://firestore.googleapis.com/v1/projects/" +
  CONFIG.projectId + "/databases/(default)/documents";

// plain value -> Firestore typed value
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  const fields = {};
  Object.keys(v).forEach(k => fields[k] = toFs(v[k]));
  return { mapValue: { fields: fields } };
}

// Firestore typed value -> plain value
function fromFs(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFs);
  if ("mapValue" in v) return fromFsFields(v.mapValue.fields || {});
  return null;
}
function fromFsFields(fields) {
  const o = {};
  Object.keys(fields).forEach(k => o[k] = fromFs(fields[k]));
  return o;
}
function fromDoc(doc) {
  const o = fromFsFields(doc.fields || {});
  o.id = doc.name.split("/").pop();
  return o;
}

function fsHeaders() {
  const token = sessionStorage.getItem("idToken");
  return token ? { Authorization: "Bearer " + token } : {};
}

// Create a document (auto id). Returns the new document as a plain object.
function addDoc(collection, data) {
  const body = { fields: toFs(data).mapValue.fields };
  return $.ajax({
    url: FS_BASE + "/" + collection + "?key=" + CONFIG.apiKey,
    method: "POST",
    contentType: "application/json",
    headers: fsHeaders(),
    data: JSON.stringify(body)
  }).then(fromDoc);
}

// Read all documents in a collection as an array of plain objects.
function getDocs(collection) {
  return $.ajax({
    url: FS_BASE + "/" + collection + "?pageSize=300&key=" + CONFIG.apiKey,
    method: "GET",
    headers: fsHeaders()
  }).then(r => (r.documents || []).map(fromDoc));
}

// Create a document with a chosen id (we use the auth user id)
function setDocById(collection, id, data) {
  const body = { fields: toFs(data).mapValue.fields };
  return $.ajax({
    url: FS_BASE + "/" + collection + "?documentId=" + id + "&key=" + CONFIG.apiKey,
    method: "POST",
    contentType: "application/json",
    headers: fsHeaders(),
    data: JSON.stringify(body)
  }).then(fromDoc);
}

// Read one document by id
function getDocById(collection, id) {
  return $.ajax({
    url: FS_BASE + "/" + collection + "/" + id + "?key=" + CONFIG.apiKey,
    method: "GET",
    headers: fsHeaders()
  }).then(fromDoc);
}

// Update only the given fields of a document
function updateDoc(collection, id, data) {
  const mask = Object.keys(data)
    .map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  const body = { fields: toFs(data).mapValue.fields };
  return $.ajax({
    url: FS_BASE + "/" + collection + "/" + id + "?" + mask + "&key=" + CONFIG.apiKey,
    method: "PATCH",
    contentType: "application/json",
    headers: fsHeaders(),
    data: JSON.stringify(body)
  }).then(fromDoc);
}

// Delete a document by id
function deleteDocById(collection, id) {
  return $.ajax({
    url: FS_BASE + "/" + collection + "/" + id + "?key=" + CONFIG.apiKey,
    method: "DELETE",
    headers: fsHeaders()
  });
}

// Escape text before putting it into HTML
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Placeholder (inline SVG) and image tag shared by admin and customer pages
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
  '<rect width="100%" height="100%" fill="#e5e7eb"/>' +
  '<text x="50%" y="50%" font-size="12" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">No image</text></svg>');

function imgHtml(url, cls) {
  return "<img class='" + cls + "' src='" + esc(url || PLACEHOLDER_IMG) + "' loading='lazy' alt='' " +
    "onerror=\"this.onerror=null;this.src=PLACEHOLDER_IMG\">";
}