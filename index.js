const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const SOAP_ENDPOINT = process.env.SOAP_ENDPOINT || "http://your-server/uniface/wsdl/CSYV1000";
const API_KEY = process.env.API_KEY || null;

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Invalid or missing API key." });
  next();
}

// ── Shared base fields ────────────────────────────────────────────────────────
function baseRequestFields(fields) {
  const {
    service         = "CSYV1000",
    groupId         = "",
    product         = "External 1.0.0.0",
    processId       = "1",
    threadId        = "1",
    nodeId          = "",
    ipAddress       = "",
    sourceUserId    = "",
    sourceOSUserId  = "",
    uiForm          = "External",
    groupIdPrevious = "",
    trace           = ""
  } = fields;

  return { service, groupId, product, processId, threadId, nodeId,
           ipAddress, sourceUserId, sourceOSUserId, uiForm, groupIdPrevious, trace };
}

// ── Envelope builders ─────────────────────────────────────────────────────────

function buildLogonEnvelope(fields) {
  const base = baseRequestFields(fields);
  const { userId = "", password = "", osUserId = "" } = fields;

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:uniface:applic:services:CSYV1000"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:s="http://www.w3.org/2001/XMLSchema"
               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <soap:Body>
    <tns:LOGON>
      <REQUEST xsi:type="s:string"><![CDATA[<root>
  <request>
    <service>${base.service}</service>
    <trace>${base.trace}</trace>
    <groupId>${base.groupId}</groupId>
    <product>${base.product}</product>
    <processId>${base.processId}</processId>
    <threadId>${base.threadId}</threadId>
    <nodeId>${base.nodeId}</nodeId>
    <ipAddress>${base.ipAddress}</ipAddress>
    <sourceUserId>${base.sourceUserId}</sourceUserId>
    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>
    <uiForm>${base.uiForm}</uiForm>
    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>
    <userId>${userId}</userId>
    <password>${password}</password>
    <osUserId>${osUserId}</osUserId>
  </request>
</root>]]></REQUEST>
    </tns:LOGON>
  </soap:Body>
</soap:Envelope>`;
}

function buildLogoffEnvelope(fields) {
  const base = baseRequestFields(fields);
  const { sessionId = "" } = fields;

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:uniface:applic:services:CSYV1000"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:s="http://www.w3.org/2001/XMLSchema"
               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <soap:Body>
    <tns:LOGOFF>
      <REQUEST xsi:type="s:string"><![CDATA[<root>
  <request>
    <service>${base.service}</service>
    <sessionId>${sessionId}</sessionId>
    <trace>${base.trace}</trace>
    <groupId>${base.groupId}</groupId>
    <product>${base.product}</product>
    <processId>${base.processId}</processId>
    <threadId>${base.threadId}</threadId>
    <nodeId>${base.nodeId}</nodeId>
    <ipAddress>${base.ipAddress}</ipAddress>
    <sourceUserId>${base.sourceUserId}</sourceUserId>
    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>
    <uiForm>${base.uiForm}</uiForm>
    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>
  </request>
</root>]]></REQUEST>
    </tns:LOGOFF>
  </soap:Body>
</soap:Envelope>`;
}

function buildExternalEnvelope(fields) {
  const base = baseRequestFields(fields);
  const { sessionId = "", method = "", requestData = {} } = fields;

  const {
    requestTypeCode = "",
    description     = "",
    notes           = "",
    priority        = "",
    nameNumber      = "",
    propertyId      = "",
    contactName     = "",
    contactPhone    = "",
    contactEmail    = ""
  } = requestData;

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="urn:uniface:applic:services:CSYV1000"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:s="http://www.w3.org/2001/XMLSchema"
               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <soap:Body>
    <tns:EXTERNAL>
      <REQUEST xsi:type="s:string"><![CDATA[<root>
  <request>
    <service>${base.service}</service>
    <method>${method}</method>
    <sessionId>${sessionId}</sessionId>
    <groupId>${base.groupId}</groupId>
    <product>${base.product}</product>
    <processId>${base.processId}</processId>
    <threadId>${base.threadId}</threadId>
    <nodeId>${base.nodeId}</nodeId>
    <ipAddress>${base.ipAddress}</ipAddress>
    <sourceUserId>${base.sourceUserId}</sourceUserId>
    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>
    <uiForm>${base.uiForm}</uiForm>
    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>
  </request>
</root>]]></REQUEST>
      <REQUESTDATA xsi:type="s:string"><![CDATA[<root>
  <request>
    <requestTypeCode>${requestTypeCode}</requestTypeCode>
    <description>${description}</description>
    <notes>${notes}</notes>
    <priority>${priority}</priority>
    <nameNumber>${nameNumber}</nameNumber>
    <propertyId>${propertyId}</propertyId>
    <contactName>${contactName}</contactName>
    <contactPhone>${contactPhone}</contactPhone>
    <contactEmail>${contactEmail}</contactEmail>
  </request>
</root>]]></REQUESTDATA>
    </tns:EXTERNAL>
  </soap:Body>
</soap:Envelope>`;
}

// ── Shared SOAP caller ────────────────────────────────────────────────────────
async function callSoap(envelope, action) {
  return axios.post(SOAP_ENDPOINT, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": `urn:uniface:applic:services:CSYV1000#${action}`
    },
    timeout: 10000
  });
}

function handleSoapError(err, res) {
  const status = err.response?.status || 500;
  res.status(status).json({
    success: false,
    error: err.message,
    soapFault: err.response?.data || null
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", endpoint: SOAP_ENDPOINT });
});

app.post("/logon", requireApiKey, async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ error: "Missing required fields.", required: ["userId", "password"] });
  }
  try {
    const soapRes = await callSoap(buildLogonEnvelope(req.body), "LOGON");
    res.json({ success: true, statusCode: soapRes.status, data: soapRes.data });
  } catch (err) { handleSoapError(err, res); }
});

app.post("/logoff", requireApiKey, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing required fields.", required: ["sessionId"] });
  }
  try {
    const soapRes = await callSoap(buildLogoffEnvelope(req.body), "LOGOFF");
    res.json({ success: true, statusCode: soapRes.status, data: soapRes.data });
  } catch (err) { handleSoapError(err, res); }
});

app.post("/external", requireApiKey, async (req, res) => {
  const { sessionId, method } = req.body;
  if (!sessionId || !method) {
    return res.status(400).json({ error: "Missing required fields.", required: ["sessionId", "method"] });
  }
  try {
    const soapRes = await callSoap(buildExternalEnvelope(req.body), "EXTERNAL");
    res.json({ success: true, statusCode: soapRes.status, data: soapRes.data });
  } catch (err) { handleSoapError(err, res); }
});

// ── Vercel export (no app.listen) ─────────────────────────────────────────────
module.exports = app;
