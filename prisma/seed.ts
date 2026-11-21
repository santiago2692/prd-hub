/**
 * Sample data so a fresh install shows how the hub works. Safe to skip in production.
 * Run: npm run db:seed (does nothing if projects already exist)
 */
import { PrismaClient, type SectionStatus } from "@prisma/client";
import { CAGAN_SECTIONS } from "../src/lib/cagan";

const db = new PrismaClient();

async function main() {
  if ((await db.project.count()) > 0) {
    console.log("Projects already exist, skipping seed.");
    return;
  }
  const owner = await db.user.upsert({
    where: { email: "demo.pm@example.com" },
    update: {},
    create: { email: "demo.pm@example.com", name: "Demo PM", role: "EDITOR" },
  });

  const filled: Record<string, { content: string; status: SectionStatus; note?: string }> = {
    problem: {
      content: "New customers drop off before their first order because setup needs a sales call. 38% of sign-ups never finish setup.",
      status: "READY",
    },
    customer: { content: "Small businesses with fewer than 20 employees who sign up on the website.", status: "DRAFT" },
    opportunity: { content: "If half of today's drop-offs activate, that's roughly 1,200 more active accounts a year.", status: "NEEDS_DATA", note: "Confirm drop-off numbers with analytics" },
    metrics: { content: "Primary: sign-up to first order within 7 days. Guardrail: support tickets per new account.", status: "NEEDS_VALIDATION", note: "Agree targets with finance" },
    solution: { content: "Guided setup in the product, see the 2028 prototype.", status: "DRAFT" },
  };

  const project = await db.project.create({
    data: {
      title: "Self-serve onboarding (sample)",
      team: "Growth",
      summary: "Let new customers set themselves up without a sales call. This is sample data to show how a PRD looks here.",
      ownerId: owner.id,
      sections: {
        create: CAGAN_SECTIONS.map((s) => ({ key: s.key, ...(filled[s.key] ?? {}), updatedById: filled[s.key] ? owner.id : null })),
      },
    },
  });

  const home = await db.siteMapNode.create({ data: { version: "VISION", title: "Home", path: "/", change: "NEW", order: 0 } });
  const onboarding = await db.siteMapNode.create({
    data: { version: "VISION", title: "Guided setup", path: "/setup", change: "NEW", parentId: home.id, order: 0, projects: { connect: { id: project.id } } },
  });
  await db.siteMapNode.create({ data: { version: "VISION", title: "Account", path: "/account", change: "NEW", parentId: home.id, order: 1 } });

  await db.journey.create({
    data: {
      title: "First order",
      persona: "New small-business customer",
      version: "VISION",
      projects: { connect: { id: project.id } },
      steps: {
        create: [
          { order: 0, title: "Signs up from the website" },
          { order: 1, title: "Completes guided setup", nodeId: onboarding.id },
          { order: 2, title: "Places first order" },
        ],
      },
    },
  });
  await db.activity.create({ data: { actorId: owner.id, projectId: project.id, message: `created the project "${project.title}"` } });
  console.log("Seeded sample project.");
}

main().finally(() => db.$disconnect());
