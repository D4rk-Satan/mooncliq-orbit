require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst({
    include: { organization: true }
  });

  if (!user) {
    console.log("No user found in database!");
    return;
  }

  console.log(`Sending test notifications to: ${user.email} (Org: ${user.organization?.name})`);

  // Clear previous test ones
  await prisma.notification.deleteMany({
    where: { organizationId: user.organizationId }
  });

  // 1. Urgent
  await prisma.notification.create({
    data: {
      organizationId: user.organizationId,
      userEmail: user.email,
      title: "🔥 Hot Lead Assigned!",
      message: "Lead 'Acme Corp' (Value: ₹5,00,000) assigned to you.",
      type: "urgent",
      actionUrl: "/lead",
      isRead: false
    }
  });

  // 2. Success
  await prisma.notification.create({
    data: {
      organizationId: user.organizationId,
      userEmail: user.email,
      title: "🎉 Deal Closed Won!",
      message: "Congratulations! Tata Motors Deal closed successfully.",
      type: "success",
      actionUrl: "/deal",
      isRead: false
    }
  });

  // 3. Info
  await prisma.notification.create({
    data: {
      organizationId: user.organizationId,
      userEmail: user.email,
      title: "ℹ️ New IndiaMart Inquiry",
      message: "Customer requested pricing catalog for Industrial Valves.",
      type: "info",
      actionUrl: "/lead",
      isRead: false
    }
  });

  console.log("SUCCESS: 3 live test notifications created in database!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
