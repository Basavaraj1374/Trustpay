// ─────────────────────────────────────────────────────────────────────────────
// services/contract.ts — Contract text generator and signer
//
// Generates a formal human-readable contract from project + milestone data,
// computes its SHA-256 fingerprint, and handles the signing process.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import { sha256 } from '../utils/hash';
import { formatInr } from '../utils/money';

/**
 * buildContractText — generates the contract as a Markdown string.
 * This is what gets hashed and signed.
 */
export function buildContractText(params: {
  projectId:    number;
  projectTitle: string;
  description:  string;
  clientName:   string;
  clientEmail:  string;
  freelancerName:  string;
  freelancerEmail: string;
  totalBudgetPaise: number;
  milestones: Array<{
    order: number;
    title: string;
    deliverables: string;
    amount: number;
    dueDate?: Date | null;
  }>;
  createdAt: Date;
}): string {
  const {
    projectId, projectTitle, description,
    clientName, clientEmail,
    freelancerName, freelancerEmail,
    totalBudgetPaise, milestones, createdAt,
  } = params;

  const milestonesText = milestones
    .map((m) =>
      `  ${m.order}. **${m.title}** — ${formatInr(m.amount)}\n` +
      `     Deliverables: ${m.deliverables}\n` +
      (m.dueDate ? `     Due: ${m.dueDate.toISOString().split('T')[0]}\n` : '')
    )
    .join('\n');

  return `# FREELANCE SERVICE AGREEMENT
## TrustPay Contract — Project #${projectId}

**Date:** ${createdAt.toISOString().split('T')[0]}

---

## PARTIES

**Client:** ${clientName} (${clientEmail})
**Freelancer:** ${freelancerName} (${freelancerEmail})

---

## PROJECT SCOPE

**Title:** ${projectTitle}

**Description:**
${description}

---

## PAYMENT TERMS

**Total Value:** ${formatInr(totalBudgetPaise)}

All payments are held in escrow by TrustPay and released per milestone upon
mutual approval. The Client may not withhold payment for work that meets the
agreed deliverables.

---

## MILESTONES

${milestonesText}

---

## TERMS & CONDITIONS

1. The Client agrees to fund each milestone escrow before the Freelancer begins work on that milestone.
2. The Freelancer agrees to deliver the specified work by the agreed deadlines.
3. The Client must approve or request revision within ${7} days of submission. Failure to respond results in automatic approval and fund release.
4. Either party may raise a dispute, which freezes the milestone funds until a Mediator resolves it.
5. This contract is legally binding upon digital signature by both parties.
6. The scope defined above cannot be changed without a new amendment signed by both parties.

---

*This contract was generated and managed by TrustPay. The SHA-256 hash of this
document is stored as proof of integrity.*
`;
}

/**
 * generateContract — creates (or regenerates) the contract for a project.
 * Called after milestones are confirmed.
 */
export async function generateContract(projectId: number) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      client:     true,
      freelancer: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  if (!project) throw new Error('Project not found.');

  const text = buildContractText({
    projectId,
    projectTitle:    project.title,
    description:     project.description,
    clientName:      project.client.name,
    clientEmail:     project.client.email,
    freelancerName:  project.freelancer.name,
    freelancerEmail: project.freelancer.email,
    totalBudgetPaise: project.totalBudget,
    milestones:      project.milestones,
    createdAt:       project.createdAt,
  });

  const hash = sha256(text);

  // Upsert — create the contract if it doesn't exist, update if it does
  // (only allowed while not yet locked)
  const existing = await db.contract.findUnique({ where: { projectId } });

  if (existing?.locked) {
    throw new Error('Contract is already signed and locked. Create an amendment to make changes.');
  }

  const contract = await db.contract.upsert({
    where:  { projectId },
    create: { projectId, text, hash },
    update: { text, hash },
  });

  return contract;
}

/**
 * signContract — records a party's digital signature.
 * When both have signed, locks the contract and activates the project.
 */
export async function signContract(
  projectId: number,
  userId: number,
  signedName: string,
  ip: string
) {
  const project = await db.project.findUnique({
    where:   { id: projectId },
    include: { contract: true },
  });

  if (!project)            throw new Error('Project not found.');
  if (!project.contract)   throw new Error('Contract not generated yet.');
  if (project.contract.locked) throw new Error('Contract is already locked.');

  const isClient     = project.clientId === userId;
  const isFreelancer = project.freelancerId === userId;

  if (!isClient && !isFreelancer) {
    throw new Error('You are not a party to this contract.');
  }

  const now = new Date();

  // Record this party's signature
  const updateData = isClient
    ? { clientSigned: true,     clientSignedName: signedName,     clientSignedAt: now,     clientIp: ip }
    : { freelancerSigned: true, freelancerSignedName: signedName, freelancerSignedAt: now, freelancerIp: ip };

  const updated = await db.contract.update({
    where: { projectId },
    data:  updateData,
  });

  // If both have signed, lock the contract and activate the project
  const bothSigned = updated.clientSigned && updated.freelancerSigned;
  if (bothSigned) {
    await db.$transaction([
      db.contract.update({ where: { projectId }, data: { locked: true } }),
      db.project.update({ where: { id: projectId }, data: { status: 'ACTIVE' } }),
    ]);

    // Notify both parties
    await db.notification.createMany({
      data: [
        {
          userId:  project.clientId,
          message: `Contract signed! Project "${project.title}" is now ACTIVE. Fund the first milestone to get started.`,
          link:    `/projects/${projectId}`,
        },
        {
          userId:  project.freelancerId,
          message: `Contract signed! Project "${project.title}" is now ACTIVE. Wait for the client to fund the first milestone.`,
          link:    `/projects/${projectId}`,
        },
      ],
    });
  }

  return { contract: updated, bothSigned };
}
