import 'dotenv/config'

import { createDatabaseConnection } from "@/drizzle/drizzle";
import { UserPostgresModel } from "@/features/auth/data/user-model";
import { PaidCustomerPostgresModel } from "@/features/stripe/data/paid-customer-model";

// Configuration from environment variables
const POSTGRES_URI =
  process.env.POSTGRES_BACKEND_URI || "postgresql://localhost:5432/beancount";

/**
 * Parse command-line arguments
 * Usage: npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts <email> [months] [clientId]
 *
 * Examples:
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com 6
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com 12 beancount-web-prod
 */
function parseArguments(): { email: string; months: number; clientId: string } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
❌ Error: Missing required argument <email>

Usage:
  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts <email> [months] [clientId]

Arguments:
  email      User email address (required)
  months     Duration in months (optional, default: 12)
  clientId   Client ID (optional, default: beancount-web-dev)

Examples:
  # Make user premium for 12 months (default)
  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com

  # Make user premium for 6 months
  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com 6

  # Make user premium for production environment
  npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/make-user-premium.ts user@example.com 12 beancount-web-prod
`);
    process.exit(1);
  }

  const email = args[0];
  const months = args[1] ? parseInt(args[1], 10) : 12;
  const clientId = args[2] || "beancount-web-dev";

  // Validate months
  if (isNaN(months) || months < 1) {
    console.error(`❌ Error: Invalid months value "${args[1]}". Must be a positive number.`);
    process.exit(1);
  }

  // Validate clientId
  if (!["beancount-web-dev", "beancount-web-prod"].includes(clientId)) {
    console.error(`❌ Error: Invalid clientId "${clientId}". Must be "beancount-web-dev" or "beancount-web-prod".`);
    process.exit(1);
  }

  return { email, months, clientId };
}

/**
 * Make a user premium by setting their currentPeriodEnd date
 */
async function makeUserPremium() {
  const { email, months, clientId } = parseArguments();

  console.log("=== Make User Premium Script ===");
  console.log(`Email: ${email}`);
  console.log(`Duration: ${months} months`);
  console.log(`Client ID: ${clientId}`);
  console.log(`PostgreSQL URI: ${POSTGRES_URI}`);
  console.log("");

  // Connect to PostgreSQL
  console.log("Connecting to PostgreSQL...");
  const db = await createDatabaseConnection(POSTGRES_URI);
  console.log("✓ Connected to PostgreSQL");
  console.log("");

  // Initialize models
  const userModel = new UserPostgresModel();
  const paidCustomerModel = new PaidCustomerPostgresModel();

  try {
    // Find user by email
    console.log(`Looking up user with email: ${email}...`);
    const user = await userModel.getByMail(db, email);

    if (!user) {
      console.error(`❌ Error: User not found with email "${email}"`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email} (ID: ${user.id})`);
    console.log("");

    // Calculate future date
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    // Check if paid customer record already exists
    const existingPaidCustomer =
      await paidCustomerModel.findByUserIdAndClientId(
        db,
        user.id.toString(),
        clientId,
      );

    if (existingPaidCustomer) {
      console.log(`Found existing paid customer record (Stripe ID: ${existingPaidCustomer.stripeCustomerId})`);
      console.log(`Updating currentPeriodEnd...`);

      await paidCustomerModel.updateByUserIdAndClientId(
        db,
        user.id.toString(),
        clientId,
        {
          currentPeriodEnd: futureDate,
          email: user.email,
        },
      );

      console.log(`✓ Updated existing paid customer record`);
    } else {
      console.log(`No existing paid customer record found. Creating new one...`);

      // Generate fake Stripe customer ID for development
      const fakeStripeCustomerId = `cus_dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      await paidCustomerModel.create(db, {
        userId: user.id.toString(),
        stripeCustomerId: fakeStripeCustomerId,
        clientId,
        email: user.email,
        currentPeriodEnd: futureDate,
      });

      console.log(`✓ Created new paid customer record (Stripe ID: ${fakeStripeCustomerId})`);
    }

    console.log("");
    console.log("=== Success! ===");
    console.log(`✅ User ${email} is now premium until ${futureDate.toISOString()}`);
    console.log(`   Premium expires: ${futureDate.toLocaleDateString()} ${futureDate.toLocaleTimeString()}`);
    console.log("");
    console.log("You can verify by checking the user's tier:");
    console.log(`
    query {
      userProfile {
        tier
      }
    }
    `);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("❌ Error making user premium:", err.message || String(error));
    process.exit(1);
  } finally {
    // Close PostgreSQL connection
    console.log("Closing PostgreSQL connection...");
    const { closeDatabaseConnection } = await import("@/drizzle/drizzle");
    await closeDatabaseConnection();
    console.log("✓ Done!");
  }
}

// Run the script
makeUserPremium().catch((error) => {
  console.error("Script failed with error:", error);
  process.exit(1);
});
