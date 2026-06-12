const express = require("express");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const { randomUUID } = require("crypto");

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
    service,
    groupId: randomUUID().toUpperCase(), // fresh GUID on every call
    product, processId, threadId, nodeId,
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
  const base = baseRequestFields(fields, "CIFV5600");
  const { sessionId = "", method = "", requestData = {} } = fields;

  const {
    typeId               = "",
    contactTypeId        = "",
    receivingOfficerId   = "",
    noteSummary          = "",
    moduleLinks          = []   // array of { moduleLinkRoleTypeId, moduleLinkApplicationId }
  } = requestData;

  // Build moduleLinks XML from array
  const moduleLinksXml = moduleLinks.length > 0
    ? `<moduleLinks>${moduleLinks.map(link => `<moduleLink>
      <moduleLinkRoleTypeId>${link.moduleLinkRoleTypeId}</moduleLinkRoleTypeId>
      <moduleLinkApplicationId>${link.moduleLinkApplicationId}</moduleLinkApplicationId>
    </moduleLink>`).join("")}</moduleLinks>`
    : "<moduleLinks/>";

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
    <contactTypeId>${contactTypeId}</contactTypeId>
    <receivingOfficerId>${receivingOfficerId}</receivingOfficerId>
    <noteSummary>${noteSummary}</noteSummary>
    ${moduleLinksXml}
  </request>
</root>]]></REQUESTDATA>
    </tns:EXTERNAL>
  </soap:Body>
</soap:Envelope>`;
}


function buildFindNamesEnvelope(fields) {
  const base = baseRequestFields(fields, "CIFV5021");
  const { sessionId = "", searchData = {} } = fields;

  const {
    name          = "",
    givenname     = "",
    nameid        = "",
    nametype      = "",
    phonetic      = "false",
    legalname     = "",
    addrqual      = "",
    roletypea     = "",
    roletypen     = "",
    retrievecount = "10",
    responsecount = "10"
  } = searchData;

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"',
    '               xmlns:tns="urn:uniface:applic:services:CSYV1000"',
    '               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '               xmlns:s="http://www.w3.org/2001/XMLSchema"',
    '               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">',
    '  <soap:Body>',
    '    <tns:EXTERNAL>',
    '      <REQUEST xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <service>${base.service}</service>`,
    "    <method>FindNames</method>",
    `    <sessionId>${sessionId}</sessionId>`,
    `    <groupId>${base.groupId}</groupId>`,
    `    <product>${base.product}</product>`,
    `    <processId>${base.processId}</processId>`,
    `    <threadId>${base.threadId}</threadId>`,
    `    <nodeId>${base.nodeId}</nodeId>`,
    `    <ipAddress>${base.ipAddress}</ipAddress>`,
    `    <sourceUserId>${base.sourceUserId}</sourceUserId>`,
    `    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>`,
    `    <uiForm>${base.uiForm}</uiForm>`,
    `    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>`,
    '  </request>',
    '</root>]]></REQUEST>',
    '      <REQUESTDATA xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <retrievecount>${retrievecount}</retrievecount>`,
    `    <responsecount>${responsecount}</responsecount>`,
    '    <search>',
    `      <nameid>${nameid}</nameid>`,
    `      <nametype>${nametype}</nametype>`,
    `      <name>${name}</name>`,
    `      <givenname>${givenname}</givenname>`,
    `      <phonetic>${phonetic}</phonetic>`,
    `      <legalname>${legalname}</legalname>`,
    `      <addrqual>${addrqual}</addrqual>`,
    `      <roletypea>${roletypea}</roletypea>`,
    `      <roletypen>${roletypen}</roletypen>`,
    '    </search>',
    '  </request>',
    '</root>]]></REQUESTDATA>',
    '    </tns:EXTERNAL>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join("\n");
}


function buildPropertyAddressSearchEnvelope(fields) {
  const base = baseRequestFields(fields, "CIFV5030");
  const { sessionId = "", searchData = {} } = fields;

  const {
    streetnumber   = "",
    streetname     = "",
    suburbname     = "",
    streettypeid   = "",
    retrievecount  = "10",
    responsecount  = "10"
  } = searchData;

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"',
    '               xmlns:tns="urn:uniface:applic:services:CSYV1000"',
    '               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '               xmlns:s="http://www.w3.org/2001/XMLSchema"',
    '               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">',
    '  <soap:Body>',
    '    <tns:EXTERNAL>',
    '      <REQUEST xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <service>${base.service}</service>`,
    "    <method>PropertyAddressSearch</method>",
    `    <sessionId>${sessionId}</sessionId>`,
    `    <groupId>${base.groupId}</groupId>`,
    `    <product>${base.product}</product>`,
    `    <processId>${base.processId}</processId>`,
    `    <threadId>${base.threadId}</threadId>`,
    `    <nodeId>${base.nodeId}</nodeId>`,
    `    <ipAddress>${base.ipAddress}</ipAddress>`,
    `    <sourceUserId>${base.sourceUserId}</sourceUserId>`,
    `    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>`,
    `    <uiForm>${base.uiForm}</uiForm>`,
    `    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>`,
    '  </request>',
    '</root>]]></REQUEST>',
    '      <REQUESTDATA xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <retrievecount>${retrievecount}</retrievecount>`,
    `    <responsecount>${responsecount}</responsecount>`,
    '    <search>',
    `      <streetnumber>${streetnumber}</streetnumber>`,
    `      <streetname>${streetname}</streetname>`,
    `      <streettypeid>${streettypeid}</streettypeid>`,
    `      <suburbname>${suburbname}</suburbname>`,
    '      <primaryaddress>true</primaryaddress>',
    '      <alternateaddress>true</alternateaddress>',
    '      <historicaddress>false</historicaddress>',
    '      <currentproperty>true</currentproperty>',
    '      <proposedproperty>false</proposedproperty>',
    '      <historicproperty>false</historicproperty>',
    '    </search>',
    '  </request>',
    '</root>]]></REQUESTDATA>',
    '    </tns:EXTERNAL>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join("\n");
}

function buildStreetSuburbSearchEnvelope(fields) {
  const base = baseRequestFields(fields, "CIFV5030");
  const { sessionId = "", searchData = {} } = fields;

  const {
    streetname     = "",
    suburbname     = "",
    councilid      = "",
    retrievecount  = "10",
    responsecount  = "10"
  } = searchData;

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"',
    '               xmlns:tns="urn:uniface:applic:services:CSYV1000"',
    '               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '               xmlns:s="http://www.w3.org/2001/XMLSchema"',
    '               soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">',
    '  <soap:Body>',
    '    <tns:EXTERNAL>',
    '      <REQUEST xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <service>${base.service}</service>`,
    "    <method>StreetSuburbSearch</method>",
    `    <sessionId>${sessionId}</sessionId>`,
    `    <groupId>${base.groupId}</groupId>`,
    `    <product>${base.product}</product>`,
    `    <processId>${base.processId}</processId>`,
    `    <threadId>${base.threadId}</threadId>`,
    `    <nodeId>${base.nodeId}</nodeId>`,
    `    <ipAddress>${base.ipAddress}</ipAddress>`,
    `    <sourceUserId>${base.sourceUserId}</sourceUserId>`,
    `    <sourceOSUserId>${base.sourceOSUserId}</sourceOSUserId>`,
    `    <uiForm>${base.uiForm}</uiForm>`,
    `    <groupIdPrevious>${base.groupIdPrevious}</groupIdPrevious>`,
    '  </request>',
    '</root>]]></REQUEST>',
    '      <REQUESTDATA xsi:type="s:string"><![CDATA[<root>',
    '  <request>',
    `    <retrievecount>${retrievecount}</retrievecount>`,
    `    <responsecount>${responsecount}</responsecount>`,
    '    <search>',
    `      <streetname>${streetname}</streetname>`,
    `      <suburbname>${suburbname}</suburbname>`,
    `      <councilid>${councilid}</councilid>`,
    '      <current>true</current>',
    '      <proposed>false</proposed>',
    '      <historic>false</historic>',
    '    </search>',
    '  </request>',
    '</root>]]></REQUESTDATA>',
    '    </tns:EXTERNAL>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join("\n");
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

// ── XML response parsers ──────────────────────────────────────────────────────
const parser = new XMLParser({ ignoreAttributes: false });

function decodeAndParse(str) {
  // fast-xml-parser auto-decodes HTML entities into #text when attributes present
  const raw = str?.["#text"] ?? str ?? "";
  if (!raw) return null;
  return parser.parse(raw);
}

function parseSessionId(xmlString) {
  try {
    const parsed = parser.parse(xmlString);
    const body = parsed?.["soapenv:Envelope"]?.["soapenv:Body"]
              ?? parsed?.["soap:Envelope"]?.["soap:Body"]
              ?? parsed?.Envelope?.Body;
    const logonNode = body?.["tns:LOGON"] ?? body?.LOGON ?? {};
    const inner = decodeAndParse(logonNode?.RESPONSE);
    return inner?.root?.response?.sessionId ?? null;
  } catch {
    return null;
  }
}

function parseRequestNumber(xmlString) {
  try {
    const parsed = parser.parse(xmlString);
    const body = parsed?.["soapenv:Envelope"]?.["soapenv:Body"]
              ?? parsed?.["soap:Envelope"]?.["soap:Body"]
              ?? parsed?.Envelope?.Body;
    const externalNode = body?.["tns:EXTERNAL"] ?? body?.EXTERNAL ?? {};

    // Check RESPONSE for errors first
    const responseInner = decodeAndParse(externalNode?.RESPONSE);
    const status = responseInner?.root?.response?.status;
    const error  = responseInner?.root?.response?.error;

    // Parse requestNumber from RESPONSEDATA
    const responseDataInner = decodeAndParse(externalNode?.RESPONSEDATA);
    const requestNumber = responseDataInner?.root?.response?.requestNumber ?? null;

    return { requestNumber, status, error: error || null };
  } catch {
    return { requestNumber: null, status: null, error: "Failed to parse response" };
  }
}


function parseFindNamesResponse(xmlString) {
  try {
    const parsed = parser.parse(xmlString);
    const body = parsed?.['soapenv:Envelope']?.['soapenv:Body']
              ?? parsed?.['soap:Envelope']?.['soap:Body']
              ?? parsed?.Envelope?.Body;
    const externalNode = body?.['tns:EXTERNAL'] ?? body?.EXTERNAL ?? {};

    const responseInner = decodeAndParse(externalNode?.RESPONSE);
    const status = responseInner?.root?.response?.status;
    const error  = responseInner?.root?.response?.error;

    const responseDataInner = decodeAndParse(externalNode?.RESPONSEDATA);
    const results = responseDataInner?.root?.response?.results?.result ?? null;

    // Normalise to array (single result comes back as object)
    const resultsArray = results
      ? (Array.isArray(results) ? results : [results])
      : [];

    const topResult = resultsArray[0] ?? null;
    const DEFAULT_NAME_ID = 87972;

    return {
      nameId: topResult?.nameid ?? DEFAULT_NAME_ID,
      topResult,
      totalResults: resultsArray.length,
      usedDefault: !topResult,
      more: responseDataInner?.root?.response?.more ?? null,
      status,
      error: error || null
    };
  } catch {
    return { nameId: 87972, topResult: null, totalResults: 0, usedDefault: true, more: null, status: null, error: 'Failed to parse response' };
  }
}

function parsePropertyAddressSearchResponse(xmlString) {
  try {
    const parsed = parser.parse(xmlString);
    const body = parsed?.["soapenv:Envelope"]?.["soapenv:Body"]
              ?? parsed?.["soap:Envelope"]?.["soap:Body"]
              ?? parsed?.Envelope?.Body;
    const externalNode = body?.["tns:EXTERNAL"] ?? body?.EXTERNAL ?? {};

    const responseInner = decodeAndParse(externalNode?.RESPONSE);
    const status = responseInner?.root?.response?.status;
    const error  = responseInner?.root?.response?.error;

    const responseDataInner = decodeAndParse(externalNode?.RESPONSEDATA);
    const results = responseDataInner?.root?.response?.result ?? null;

    // Normalise to array (single result comes back as object)
    const resultsArray = results
      ? (Array.isArray(results) ? results : [results])
      : [];

    const topResult = resultsArray[0] ?? null;
    const DEFAULT_PROPERTY_ID = 393760;

    return {
      propertyId: topResult?.propertyid ?? DEFAULT_PROPERTY_ID,
      topResult,
      totalResults: resultsArray.length,
      usedDefault: !topResult,
      more: responseDataInner?.root?.response?.more ?? null,
      status,
      error: error || null
    };
  } catch {
    return { propertyId: 393760, topResult: null, totalResults: 0, usedDefault: true, more: null, status: null, error: "Failed to parse response" };
  }
}

function parseStreetSuburbSearchResponse(xmlString) {
  try {
    const parsed = parser.parse(xmlString);
    const body = parsed?.["soapenv:Envelope"]?.["soapenv:Body"]
              ?? parsed?.["soap:Envelope"]?.["soap:Body"]
              ?? parsed?.Envelope?.Body;
    const externalNode = body?.["tns:EXTERNAL"] ?? body?.EXTERNAL ?? {};

    const responseInner = decodeAndParse(externalNode?.RESPONSE);
    const status = responseInner?.root?.response?.status;
    const error  = responseInner?.root?.response?.error;

    const responseDataInner = decodeAndParse(externalNode?.RESPONSEDATA);
    const results = responseDataInner?.root?.response?.results?.result ?? null;

    // Normalise to array (single result comes back as object)
    const resultsArray = results
      ? (Array.isArray(results) ? results : [results])
      : [];

    const topResult = resultsArray[0] ?? null;
    const DEFAULT_STREET_SUBURB_ID = 215614;

    return {
      streetSuburbId: topResult?.streetSuburbId ?? DEFAULT_STREET_SUBURB_ID,
      topResult,
      totalResults: resultsArray.length,
      usedDefault: !topResult,
      more: responseDataInner?.root?.response?.more ?? null,
      status,
      error: error || null
    };
  } catch {
    return { streetSuburbId: 215614, topResult: null, totalResults: 0, usedDefault: true, more: null, status: null, error: "Failed to parse response" };
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
    const { requestNumber, status, error } = parseRequestNumber(soapRes.data);
    res.json({
      success: true,
      statusCode: soapRes.status,
      requestNumber: requestNumber ?? undefined,
      pathwayStatus: status ?? undefined,
      pathwayError: error ?? undefined,
      ...(requestNumber === null && { warning: "Could not parse requestNumber — check rawResponse" }),
      rawResponse: soapRes.data
    });
  } catch (err) { handleSoapError(err, res); }
});


app.post('/find-names', requireApiKey, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing required fields.', required: ['sessionId'] });
  }
  try {
    const soapRes = await callSoap(buildFindNamesEnvelope(req.body), 'EXTERNAL');
    const { nameId, topResult, totalResults, more, status, error } = parseFindNamesResponse(soapRes.data);
    res.json({
      success: true,
      statusCode: soapRes.status,
      nameId: nameId ?? undefined,
      topResult: topResult ?? undefined,
      totalResults,
      more,
      pathwayStatus: status ?? undefined,
      pathwayError: error ?? undefined,
      ...(nameId === null && { warning: 'Could not parse nameId — check rawResponse' }),
      rawResponse: soapRes.data
    });
  } catch (err) { handleSoapError(err, res); }
});

app.post("/property-address-search", requireApiKey, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing required fields.", required: ["sessionId"] });
  }
  try {
    const soapRes = await callSoap(buildPropertyAddressSearchEnvelope(req.body), "EXTERNAL");
    const { propertyId, topResult, totalResults, more, usedDefault, status, error } = parsePropertyAddressSearchResponse(soapRes.data);
    res.json({
      success: true,
      statusCode: soapRes.status,
      propertyId,
      topResult: topResult ?? undefined,
      totalResults,
      usedDefault,
      more,
      pathwayStatus: status ?? undefined,
      pathwayError: error ?? undefined,
      rawResponse: soapRes.data
    });
  } catch (err) { handleSoapError(err, res); }
});

app.post("/street-suburb-search", requireApiKey, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing required fields.", required: ["sessionId"] });
  }
  try {
    const soapRes = await callSoap(buildStreetSuburbSearchEnvelope(req.body), "EXTERNAL");
    const { streetSuburbId, topResult, totalResults, more, usedDefault, status, error } = parseStreetSuburbSearchResponse(soapRes.data);
    res.json({
      success: true,
      statusCode: soapRes.status,
      streetSuburbId,
      topResult: topResult ?? undefined,
      totalResults,
      usedDefault,
      more,
      pathwayStatus: status ?? undefined,
      pathwayError: error ?? undefined,
      rawResponse: soapRes.data
    });
  } catch (err) { handleSoapError(err, res); }
});
// ── Vercel export (no app.listen) ─────────────────────────────────────────────
module.exports = app;