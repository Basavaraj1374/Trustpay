// ─────────────────────────────────────────────────────────────────────────────
// prisma/seed.ts — Database Seeder
//
// This script runs when you do `npm run seed`. It wipes the database and
// inserts the demo users, a sample project, and a funded milestone so you
// can test the app immediately without clicking through the whole setup flow.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { suggestMilestones } from '../services/milestoneGen';
import { generateContract } from '../services/contract';
import { fundMilestone } from '../services/escrow';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Wipe existing data (in reverse dependency order)
  await prisma.notification.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.ledger.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create standard password hash
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  // 3. Create demo users
  const client = await prisma.user.create({
    data: {
      name: 'Arjun Mehta',
      email: 'client@demo.com',
      passwordHash,
      role: 'CLIENT',
      walletBalance: 10000000, // ₹1,00,000 top-up (in paise)
    }
  });

  const freelancer = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'freelancer@demo.com',
      passwordHash,
      role: 'FREELANCER',
      walletBalance: 0,
    }
  });

  const mediator = await prisma.user.create({
    data: {
      name: 'Admin Mediator',
      email: 'admin@demo.com',
      passwordHash,
      role: 'MEDIATOR',
      walletBalance: 0,
    }
  });

  console.log('✅ Created users (client, freelancer, mediator)');

  // 4. Create sample project
  const project = await prisma.project.create({
    data: {
      title: 'Portfolio Website Redesign',
      description: 'Need a modern, responsive React portfolio website with a dark mode toggle and blog integration.',
      totalBudget: 5000000, // ₹50,000 (in paise)
      status: 'DRAFT',
      clientId: client.id,
      freelancerId: freelancer.id,
    }
  });

  console.log('✅ Created sample project');

  // 5. Generate and save milestones
  const suggestions = suggestMilestones(project.title, project.description, project.totalBudget);
  
  for (const ms of suggestions) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        order: ms.order,
        title: ms.title,
        description: ms.description,
        deliverables: ms.deliverables,
        amount: Math.round((project.totalBudget * ms.percentage) / 100),
      }
    });
  }

  // 6. Generate contract and sign it by both parties (makes project ACTIVE)
  await generateContract(project.id);
  
  await prisma.contract.update({
    where: { projectId: project.id },
    data: {
      clientSigned: true,
      clientSignedName: client.name,
      clientSignedAt: new Date(),
      clientIp: '127.0.0.1',
      freelancerSigned: true,
      freelancerSignedName: freelancer.name,
      freelancerSignedAt: new Date(),
      freelancerIp: '127.0.0.1',
      locked: true,
    }
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'ACTIVE' }
  });

  console.log('✅ Generated and signed contract');

  // 7. Fund the first milestone so there's active escrow
  const firstMilestone = await prisma.milestone.findFirst({
    where: { projectId: project.id, order: 1 }
  });

  if (firstMilestone) {
    await fundMilestone(firstMilestone.id, client.id);
    
    // Simulate freelancer starting work
    await prisma.milestone.update({
      where: { id: firstMilestone.id },
      data: { status: 'IN_PROGRESS' }
    });
    console.log(`✅ Funded Milestone 1: "${firstMilestone.title}" and set to IN_PROGRESS`);
  }

  // Initial ledger entries mapping
  await prisma.ledger.create({
    data: {
      type: 'DEPOSIT',
      amount: 10000000,
      toUserId: client.id,
      note: 'Initial demo wallet top-up (₹1,00,000)',
    }
  });

  console.log('🎉 Seed complete! You can log in as client@demo.com or freelancer@demo.com (pw: Demo1234!)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
