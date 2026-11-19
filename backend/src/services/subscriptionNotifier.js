import { query } from "../db/pool.js";
import { broadcastNotification } from "../routes/modules/notifications.js";
import { triggerSecurityAlert } from "./securityAlerts.js";

/**
 * Sends in-app and email/alert notifications to Company Admin accounts
 * whenever a subscription package is assigned, changed, extended, or verified.
 *
 * @param {Object} params
 * @param {number|string} params.branchId - The branch ID whose subscription changed
 * @param {number|string} params.planId - The subscription plan ID
 * @param {string|null} [params.startDate] - Start date of the subscription (YYYY-MM-DD)
 * @param {string|null} [params.endDate] - End date of the subscription (YYYY-MM-DD)
 * @param {string} [params.actionType] - 'assigned' | 'plan_changed' | 'extended' | 'payment_verified' | 'modules_updated'
 * @param {boolean} [params.applyToAllBranches] - Whether all branches of the company were updated
 * @returns {Promise<boolean>}
 */
export async function notifyCompanyAdminsOfPackageChange({
  branchId,
  planId,
  startDate = null,
  endDate = null,
  actionType = "assigned",
  applyToAllBranches = false
}) {
  try {
    if (!branchId || !planId) {
      console.warn("[subscriptionNotifier] Missing branchId or planId:", { branchId, planId });
      return false;
    }

    // 1. Fetch branch, company, and plan details
    const [info] = await query(
      `SELECT b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
              biz.id AS business_id, biz.name AS business_name, biz.email AS business_email,
              sp.id AS plan_id, sp.name AS plan_name, sp.price AS plan_price,
              sp.billing_period, sp.duration_value, sp.duration_unit, sp.allowed_pages,
              bs.id AS subscription_id, bs.status AS subscription_status,
              COALESCE(bs.current_period_ends_on, bs.trial_ends_on) AS current_period_ends_on
       FROM branches b
       JOIN businesses biz ON biz.id = b.business_id
       JOIN subscription_plans sp ON sp.id = :planId
       LEFT JOIN branch_subscriptions bs ON bs.branch_id = b.id
       WHERE b.id = :branchId`,
      { branchId, planId }
    );

    if (!info) {
      console.warn(`[subscriptionNotifier] Branch ${branchId} or Plan ${planId} not found in database`);
      return false;
    }

    const {
      branch_id,
      branch_name,
      branch_code,
      business_id,
      business_name,
      plan_id,
      plan_name,
      plan_price,
      billing_period,
      subscription_id,
      current_period_ends_on
    } = info;

    const effectiveEndDate = endDate || current_period_ends_on;

    // 2. Fetch all Company Admin users for this company
    const companyAdmins = await query(
      `SELECT u.id, u.email, u.full_name, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.business_id = :businessId
         AND r.name IN ('business_super_admin', 'admin')
         AND u.is_active = 1`,
      { businessId: business_id }
    );

    // 3. Compose title and message
    let title = `📦 Subscription Package: ${plan_name}`;
    let message = "";
    const scopeLabel = applyToAllBranches
      ? `all branches of '${business_name}'`
      : `branch '${branch_name}' (${branch_code || "Main"})`;

    if (actionType === "assigned" || actionType === "plan_changed") {
      title = `📦 Subscription Package Changed: ${plan_name}`;
      message = `Your subscription package for ${scopeLabel} has been updated to '${plan_name}' (PKR ${Number(plan_price || 0).toLocaleString()} / ${billing_period || "month"}). Validity: ${startDate ? `from ${startDate} ` : ""}through ${effectiveEndDate || "Active"}. All features and module entitlements for this package are now active.`;
    } else if (actionType === "extended") {
      title = `⚡ Subscription Extended: ${plan_name}`;
      message = `Your subscription for ${scopeLabel} (${plan_name}) has been extended through ${effectiveEndDate}. All cloud services and modules remain fully operational.`;
    } else if (actionType === "payment_verified") {
      title = `✅ Payment Verified & Package Activated: ${plan_name}`;
      message = `Your subscription payment for ${scopeLabel} has been verified and approved. Package '${plan_name}' is active through ${effectiveEndDate}.`;
    } else if (actionType === "modules_updated") {
      title = `🔄 Package Features Updated: ${plan_name}`;
      message = `The feature entitlements and module access for package '${plan_name}' have been updated by the SaaS Platform Administrator for ${scopeLabel}.`;
    } else {
      title = `📦 Subscription Package Updated: ${plan_name}`;
      message = `Subscription package update for ${scopeLabel} (${plan_name}). Validity through ${effectiveEndDate || "Active"}.`;
    }

    // 4. Insert into `notifications` table for in-app bell & dashboard unread list
    const result = await query(
      `INSERT INTO notifications (
        branch_id,
        notification_type,
        reference_type,
        reference_id,
        title,
        message,
        due_date,
        is_read
      ) VALUES (
        :branch_id,
        'package_changed',
        'subscription',
        :reference_id,
        :title,
        :message,
        :due_date,
        0
      )`,
      {
        branch_id,
        reference_id: subscription_id || branch_id,
        title,
        message,
        due_date: effectiveEndDate || null
      }
    );

    const notificationId = result.insertId;

    // 5. Broadcast real-time event via SSE to connected company admin clients
    try {
      broadcastNotification({
        businessId: business_id,
        branchId: branch_id,
        notification: {
          id: notificationId,
          branch_id,
          branch_name,
          branch_code,
          notification_type: "package_changed",
          type: "package_changed",
          reference_type: "subscription",
          reference_id: subscription_id || branch_id,
          title,
          message,
          due_date: effectiveEndDate || null,
          is_read: 0,
          created_at: new Date().toISOString()
        }
      });
    } catch (sseErr) {
      console.warn("[subscriptionNotifier] SSE broadcast warning:", sseErr.message);
    }

    // 6. Send alert / simulated email dispatch to all Company Admin accounts
    if (Array.isArray(companyAdmins) && companyAdmins.length > 0) {
      for (const admin of companyAdmins) {
        if (!admin.email) continue;
        await triggerSecurityAlert({
          alertType: "package_subscription_updated",
          severity: "low",
          userId: admin.id,
          recipientEmail: admin.email,
          subject: `[DigitalMarkaz360] Subscription Package Notification - ${business_name}`,
          message: `Dear ${admin.full_name || "Company Administrator"},\n\n` +
            `Your subscription package for ${scopeLabel} at '${business_name}' has been updated to '${plan_name}'.\n\n` +
            `Package Summary:\n` +
            `• Package Name: ${plan_name}\n` +
            `• Price: PKR ${Number(plan_price || 0).toLocaleString()} / ${billing_period || "month"}\n` +
            `• Validity Period: ${startDate ? `from ${startDate} ` : ""}through ${effectiveEndDate || "Active"}\n\n` +
            `Log in to your DigitalMarkaz360 portal to review your package entitlements and access your updated features.\n\n` +
            `Best regards,\n` +
            `DigitalMarkaz360 Platform Administration`,
          metadata: {
            businessId: business_id,
            branchId: branch_id,
            planId: plan_id,
            planName: plan_name,
            actionType,
            notificationId
          }
        }).catch((alertErr) => {
          console.warn(`[subscriptionNotifier] Alert dispatch warning for ${admin.email}:`, alertErr.message);
        });
      }
    } else {
      console.log(`[subscriptionNotifier] Note: No company admins found for business ${business_id}`);
    }

    console.log(`[subscriptionNotifier] Successfully notified company admins of business ${business_id} for package '${plan_name}'`);
    return true;
  } catch (error) {
    console.error("[subscriptionNotifier] Error sending package change notification:", error);
    return false;
  }
}
