import cron from "node-cron";
import User from "../models/User.js";
import { sendWelcomeEmail } from "./emailService.js";

// Cron job to send daily welcome emails at midnight
export const startDailyWelcomeEmailJob = () => {
  // Run every day at midnight (00:00)
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log(
        "Starting daily welcome email job at:",
        new Date().toISOString()
      );

      try {
        // Find all active users who haven't received a welcome email today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get users created today or users who are active
        const users = await User.find({
          isActive: true,
          $or: [
            {
              createdAt: {
                $gte: today,
                $lt: tomorrow,
              },
            },
            {
              // Send welcome email to all active users (you can modify this logic)
              emailVerified: true,
            },
          ],
        }).select("name email createdAt");

        console.log(`Found ${users.length} users to send welcome emails to`);

        // Send welcome emails to all found users
        const emailPromises = users.map(async (user) => {
          try {
            const result = await sendWelcomeEmail(user.email, user.name);
            if (result.success) {
              console.log(`Welcome email sent successfully to ${user.email}`);
            } else {
              console.error(
                `Failed to send welcome email to ${user.email}:`,
                result.error
              );
            }
            return result;
          } catch (error) {
            console.error(
              `Error sending welcome email to ${user.email}:`,
              error
            );
            return { success: false, error: error.message };
          }
        });

        const results = await Promise.allSettled(emailPromises);
        const successful = results.filter(
          (result) => result.status === "fulfilled" && result.value.success
        ).length;

        console.log(
          `Daily welcome email job completed. Successfully sent ${successful} out of ${users.length} emails`
        );
      } catch (error) {
        console.error("Error in daily welcome email job:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York", // You can change this to your preferred timezone
    }
  );

  console.log("Daily welcome email cron job scheduled successfully");
};

// Cron job to send welcome emails to new users (runs every hour)
export const startHourlyNewUserWelcomeJob = () => {
  // Run every hour at minute 0
  cron.schedule(
    "0 * * * *",
    async () => {
      console.log(
        "Starting hourly new user welcome email job at:",
        new Date().toISOString()
      );

      try {
        // Find users created in the last hour who haven't been sent a welcome email
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const newUsers = await User.find({
          createdAt: { $gte: oneHourAgo },
          isActive: true,
          emailVerified: true,
        }).select("name email createdAt");

        console.log(
          `Found ${newUsers.length} new users to send welcome emails to`
        );

        if (newUsers.length > 0) {
          const emailPromises = newUsers.map(async (user) => {
            try {
              const result = await sendWelcomeEmail(user.email, user.name);
              if (result.success) {
                console.log(
                  `Welcome email sent successfully to new user ${user.email}`
                );
              } else {
                console.error(
                  `Failed to send welcome email to new user ${user.email}:`,
                  result.error
                );
              }
              return result;
            } catch (error) {
              console.error(
                `Error sending welcome email to new user ${user.email}:`,
                error
              );
              return { success: false, error: error.message };
            }
          });

          const results = await Promise.allSettled(emailPromises);
          const successful = results.filter(
            (result) => result.status === "fulfilled" && result.value.success
          ).length;

          console.log(
            `Hourly new user welcome email job completed. Successfully sent ${successful} out of ${newUsers.length} emails`
          );
        }
      } catch (error) {
        console.error("Error in hourly new user welcome email job:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York", // You can change this to your preferred timezone
    }
  );

  console.log("Hourly new user welcome email cron job scheduled successfully");
};

// Function to start all cron jobs
export const startAllCronJobs = () => {
  startDailyWelcomeEmailJob();
  startHourlyNewUserWelcomeJob();
  console.log("All cron jobs started successfully");
};

export default {
  startDailyWelcomeEmailJob,
  startHourlyNewUserWelcomeJob,
  startAllCronJobs,
};
