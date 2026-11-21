// Minimal in-memory stand-in for the db/user/assets capabilities, for local testing only.
window.claude = { use: async (name) => {
  const st = window.__st || (window.__st = { data: {}, subs: [] });
  const notify = () => st.subs.forEach(({ col, fn }) => fn({ docs: Object.entries(st.data[col] || {}).map(([id, d]) => ({ id, exists: true, data: () => d })), metadata: { fromCache: false } }));
  if (name === "db") return {
    collection: (col) => ({ onSnapshot: (fn) => { st.subs.push({ col, fn }); setTimeout(notify, 50); return () => {}; } }),
    doc: (path) => { const [col, id] = path.split("/"); return {
      set: async (d) => { (st.data[col] ||= {})[id] = JSON.parse(JSON.stringify(d)); setTimeout(notify, 10); },
      update: async (d) => { if (!st.data[col]?.[id]) throw { code: "invalid_argument" }; Object.assign(st.data[col][id], JSON.parse(JSON.stringify(d))); setTimeout(notify, 10); },
      delete: async () => { delete st.data[col]?.[id]; setTimeout(notify, 10); } }; } };
  if (name === "user") return { me: async () => ({ id: "u1", name: "Santiago G", color: "#2b54e0" }), canEdit: async () => true, can: async () => true, profiles: async (ids) => Object.fromEntries([].concat(ids).map((i) => [i, { name: i === "u1" ? "Santiago G" : "", color: "#555" }])) };
  if (name === "assets") return { upload: async (b) => ({ id: "a" + Math.random().toString(16).slice(2), url: "" }) };
  return null; } };
window.__sampleCalls = [];
const _use = window.claude.use;
window.claude.use = async (name) => name === "sample" ? Object.assign(async () => ({ text: "" }), {
  limits: async () => ({ maxInputBytes: 100000 }),
  json: async (input) => { window.__sampleCalls.push(input); if (String(input).includes("Extract every dated milestone")) return { items: [{ date: "2027-03-31", label: "Pilot in Toronto", kind: "release", state: "planned", detail: "Pass in one city" }, { date: "2027-02-01", label: "Pricing approved", kind: "milestone", state: "planned" }] }; return { releases: [{ name: "Pass beta", date: "2027-04-15", scope: "Monthly pass in two cities", status: "planned" }], learningPlan: [{ question: "Will commuters prepay?", risk: "value", method: "Fake door", signal: "5% tap", status: "planned" }], readiness: { internalSummary: "Support trained before beta.", externalSummary: "Riders in two cities can buy a pass.", items: [{ audience: "internal", group: "Support", expect: "Pass refund macros", date: "2027-04-01" }] }, name: "Ride pass", goal: "Let riders buy a monthly pass in the app.", team: "Rider app", objective: "Make commuting by app the default", keyResults: [{ name: "Monthly pass buyers", baseline: 0, target: 20000, unit: "" }], exists: false, phase: 1, sections: { problem: { text: "Commuters pay per ride and churn (from research.pdf).", status: "data", need: "Churn by city" }, customer: { text: "Daily commuters.", status: "draft", need: "" } }, milestones: [{ date: "Jan 10", label: "Pricing review", state: "next" }], journey: { today: [], vision: [{ step: "Open app", note: "" }, { step: "Buy pass", note: "Apple Pay" }] } }; } }) : _use(name);
