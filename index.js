const express = require("express");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

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
function baseRequestFields(fields, service = "CSYV1000") {
  const {
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

  return {
    service, groupId, product, processId, threadId, nodeId,
    ipAddress, sourceUserId, sourceOSUserId, uiForm, groupIdPrevious, trace
  };
}

// ── Envelope builders ─────────────────────────────────────────────────────────

function buildLogonEnvelope(fields) {
  const base = baseRequestFields(fields, "CSYV1000");
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
  const base = baseRequestFields(fields, "CSYV1000");
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
  // EXTERNAL/CreateRequest uses CIFV5600, not CSYV1000
  const base = baseRequestFields(fields, "CIFV5600");
  const { sessionId = "", method = "", requestData = {} } = fields;

  const {
    typeId              = "",
    noteSummary         = "",
    contactTypeId       = "",
    receivingOfficerId  = "",
    responsibleOfficerId = "",
    actioningOfficerId  = "",
    requestorTypeId     = "",
    serviceDate         = "",
    visibleToPublic     = "",
    // Module links — required for WLEAKS
    incidentPropertyId  = "",   // Incident Property module link
    streetSuburb        = "",   // Street/Suburb module link
    questionnaires      = "",
    moduleLinks         = ""
  } = requestData;

  // Build mandatory WLEAKS module links if property/street provided
  const moduleLinksXml = buildModuleLinks({ incidentPropertyId, streetSuburb, moduleLinks });

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
    <typeId>${typeId}</typeId>
    <noteSummary>${noteSummary}</noteSummary>
    <contactTypeId>${contactTypeId}</contactTypeId>
    <receivingOfficerId>${receivingOfficerId}</receivingOfficerId>
    <responsibleOfficerId>${responsibleOfficerId}</responsibleOfficerId>
    <actioningOfficerId>${actioningOfficerId}</actioningOfficerId>
    <requestorTypeId>${requestorTypeId}</requestorTypeId>
    <serviceDate>${serviceDate}</serviceDate>
    <visibleToPublic>${visibleToPublic}</visibleToPublic>
    ${moduleLinksXml}
  </request>
</root>]]></REQUESTDATA>
    </tns:EXTERNAL>
  </soap:Body>
</soap:Envelope>`;
}

// ── Module links builder (required for WLEAKS) ────────────────────────────────
function buildModuleLinks({ incidentPropertyId, streetSuburb, moduleLinks }) {
  // If raw moduleLinks XML was passed, use it directly
  if (moduleLinks) return moduleLinks;

  const links = [];

  if (incidentPropertyId) {
    links.push(`<moduleLink>
      <type>IncidentProperty</type>
      <id>${incidentPropertyId}</id>
    </moduleLink>`);
  }

  if (streetSuburb) {
    links.push(`<moduleLink>
      <type>StreetSuburb</type>
      <value>${streetSuburb}</value>
    </moduleLink>`);
  }

  if (links.length === 0) return "<moduleLinks/>";

  return `<moduleLinks>\n    ${links.join("\n    ")}\n  </moduleLinks>`;
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

// ── Parse sessionId from SOAP XML response ────────────────────────────────────
function parseSessionId(xmlString) {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xmlString);

    const body = parsed?.["soapenv:Envelope"]?.["soapenv:Body"]
              ?? parsed?.["soap:Envelope"]?.["soap:Body"]
              ?? parsed?.Envelope?.Body;

    const logonNode = body?.["tns:LOGON"] ?? body?.LOGON ?? {};
    const responseStr = logonNode?.RESPONSE?.["#text"] ?? logonNode?.RESPONSE ?? "";

    if (!responseStr) return null;

    const inner = parser.parse(responseStr);
    return inner?.root?.response?.sessionId ?? null;
  } catch {
    return null;
  }
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
    const sessionId = parseSessionId(soapRes.data);
    res.json({
      success: true,
      statusCode: soapRes.status,
      sessionId: sessionId ?? undefined,
      ...(sessionId === null && { warning: "Could not parse sessionId from response — check rawResponse" }),
      rawResponse: soapRes.data
    });
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