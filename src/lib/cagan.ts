/**
 * PRD checklist based on Marty Cagan's opportunity assessment and product spec guidance (Inspired).
 * The ten opportunity questions, the solution spec (the prototype is the spec), and the four big risks.
 */

export type SectionGroup = "opportunity" | "solution" | "risks";

export type CaganSection = {
  key: string;
  group: SectionGroup;
  title: string;
  question: string;
  guidance: string[];
  evidence: string; // what data or validation usually backs this up
};

export const GROUPS: Record<SectionGroup, { title: string; blurb: string }> = {
  opportunity: {
    title: "Opportunity assessment",
    blurb: "Cagan's ten questions. Answer them before committing people to build.",
  },
  solution: {
    title: "Solution spec",
    blurb: "The high-fidelity prototype is the spec. Text covers what the prototype can't show.",
  },
  risks: {
    title: "The four big risks",
    blurb: "Each risk needs evidence before we build, not after we ship.",
  },
};

export const CAGAN_SECTIONS: CaganSection[] = [
  {
    key: "problem",
    group: "opportunity",
    title: "Problem & value proposition",
    question: "Exactly what problem will this solve?",
    guidance: [
      "State the customer problem, not the feature.",
      "Describe the value the customer gets when it's solved.",
      "Link the research, tickets or quotes that show the problem is real.",
    ],
    evidence: "Customer interviews, support tickets, usage data",
  },
  {
    key: "customer",
    group: "opportunity",
    title: "Target customer",
    question: "For whom do we solve that problem?",
    guidance: [
      "Name the persona or segment, and who it is not for.",
      "Size of the segment and how we reach them today.",
    ],
    evidence: "Personas, segment analytics",
  },
  {
    key: "opportunity",
    group: "opportunity",
    title: "Opportunity size",
    question: "How big is the opportunity?",
    guidance: [
      "Revenue, cost saving, retention or engagement impact, with the math shown.",
      "State assumptions so others can challenge them.",
    ],
    evidence: "Market sizing, funnel data, financial model",
  },
  {
    key: "alternatives",
    group: "opportunity",
    title: "Alternatives",
    question: "What alternatives are out there?",
    guidance: [
      "Competitors, workarounds, and doing nothing.",
      "Why customers would switch.",
    ],
    evidence: "Competitive analysis, customer workarounds",
  },
  {
    key: "why_us",
    group: "opportunity",
    title: "Why we're best suited",
    question: "Why are we best suited to pursue this?",
    guidance: ["Our differentiator: data, distribution, tech or brand.", "What we can do that others can't."],
    evidence: "Capability assessment",
  },
  {
    key: "why_now",
    group: "opportunity",
    title: "Why now",
    question: "Why now? (market window)",
    guidance: ["What changed in the market, technology or our business that makes this the right time."],
    evidence: "Market trends, strategy docs",
  },
  {
    key: "gtm",
    group: "opportunity",
    title: "Go-to-market",
    question: "How will we get this product to market?",
    guidance: ["Launch plan, channels, pricing or packaging changes, and who needs enabling (sales, support)."],
    evidence: "GTM plan, stakeholder sign-off",
  },
  {
    key: "metrics",
    group: "opportunity",
    title: "Success metrics",
    question: "How will we measure success?",
    guidance: [
      "One primary metric with a baseline and a target.",
      "Guardrail metrics we must not hurt.",
      "How and when we'll measure.",
    ],
    evidence: "Baseline from analytics, instrumentation plan",
  },
  {
    key: "success_factors",
    group: "opportunity",
    title: "Critical success factors",
    question: "What factors are critical to success?",
    guidance: ["Dependencies, partners, teams and technical prerequisites.", "What must be true for this to work."],
    evidence: "Dependency map, partner commitments",
  },
  {
    key: "recommendation",
    group: "opportunity",
    title: "Recommendation",
    question: "Given the above, what's the recommendation? (go / no-go)",
    guidance: ["Go, no-go, or what we need to learn first.", "The smallest next step."],
    evidence: "Review decision",
  },
  {
    key: "solution",
    group: "solution",
    title: "Solution & prototype",
    question: "What will we build, shown as a prototype?",
    guidance: [
      "Link the 2028 prototype and the site map pages it touches.",
      "Key use cases and the journey before and after.",
      "Call out what is new, improved or removed compared to today.",
    ],
    evidence: "Clickable prototype, site map, journeys",
  },
  {
    key: "requirements",
    group: "solution",
    title: "Business rules & non-functional requirements",
    question: "What can't the prototype show?",
    guidance: [
      "Business rules, edge cases, permissions.",
      "Performance, accessibility, security, compliance, localization.",
      "Explicit non-goals.",
    ],
    evidence: "Engineering and legal review",
  },
  {
    key: "risk_value",
    group: "risks",
    title: "Value risk",
    question: "Will customers buy it or choose to use it?",
    guidance: ["Show validation with real customers: tests, prototype sessions, demand signals."],
    evidence: "Prototype tests, fake-door tests, interviews",
  },
  {
    key: "risk_usability",
    group: "risks",
    title: "Usability risk",
    question: "Can users figure out how to use it?",
    guidance: ["Usability testing of the prototype, with findings and changes made."],
    evidence: "Usability test results",
  },
  {
    key: "risk_feasibility",
    group: "risks",
    title: "Feasibility risk",
    question: "Can our engineers build it with the time, skills and technology we have?",
    guidance: ["Engineering spike or estimate, technical unknowns, build vs buy."],
    evidence: "Tech spike, architecture review",
  },
  {
    key: "risk_viability",
    group: "risks",
    title: "Business viability risk",
    question: "Does this work for the rest of the business?",
    guidance: ["Legal, finance, sales, marketing, support and brand have weighed in."],
    evidence: "Stakeholder reviews",
  },
];

export const SECTION_BY_KEY = Object.fromEntries(CAGAN_SECTIONS.map((s) => [s.key, s]));
