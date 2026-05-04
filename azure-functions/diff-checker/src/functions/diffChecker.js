const { app } = require("@azure/functions");
const { compareStructures } = require("../diffEngine");

app.http("diffChecker", {
  methods: ["POST"],
  authLevel: "function",
  route: "diff",
  handler: async (request) => {
    let body;

    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { error: "Request body must be valid JSON." },
      };
    }

    if (!body || !Object.prototype.hasOwnProperty.call(body, "previous")) {
      return {
        status: 400,
        jsonBody: { error: "Missing required field: previous." },
      };
    }

    if (!Object.prototype.hasOwnProperty.call(body, "current")) {
      return {
        status: 400,
        jsonBody: { error: "Missing required field: current." },
      };
    }

    return {
      jsonBody: compareStructures(body.previous, body.current),
    };
  },
});
