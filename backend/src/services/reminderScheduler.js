import { query } from "../db/pool.js";

let started = false;

async function createReminderNotifications() {
  await query(
    `INSERT INTO notifications (branch_id, notification_type, reference_type, reference_id, title, message, due_date)
     SELECT r.branch_id,
            CASE
              WHEN r.due_date = CURDATE() THEN 'receivable_due'
              ELSE 'receivable_overdue'
            END,
            'receivable',
            r.id,
            CASE
              WHEN r.due_date = CURDATE() THEN 'Receivable due today'
              ELSE 'Receivable overdue'
            END,
            CONCAT('Sale receivable for ', COALESCE(p.name, 'customer'), ' is pending. Balance: PKR ', r.balance_amount),
            r.due_date
     FROM receivables r
     JOIN branch_subscriptions bs ON bs.branch_id = r.branch_id
     LEFT JOIN parties p ON p.id = r.party_id
     LEFT JOIN notifications n
       ON n.reference_type = 'receivable'
      AND n.reference_id = r.id
      AND n.notification_type IN ('receivable_due', 'receivable_overdue')
      AND DATE(n.created_at) = CURDATE()
     WHERE r.balance_amount > 0
       AND r.due_date IS NOT NULL
       AND (r.due_date = CURDATE() OR r.due_date < CURDATE())
       AND bs.status IN ('active', 'trialing')
       AND (bs.current_period_ends_on IS NULL OR bs.current_period_ends_on >= CURDATE())
       AND n.id IS NULL`
  );

  await query(
    `INSERT INTO notifications (branch_id, notification_type, reference_type, reference_id, title, message, due_date)
     SELECT pbl.branch_id,
            CASE
              WHEN pbl.due_date = CURDATE() THEN 'payable_due'
              ELSE 'payable_overdue'
            END,
            'payable',
            pbl.id,
            CASE
              WHEN pbl.due_date = CURDATE() THEN 'Payable due today'
              ELSE 'Payable overdue'
            END,
            CONCAT('Purchase payable for ', COALESCE(pt.name, 'vendor'), ' is pending. Balance: PKR ', pbl.balance_amount),
            pbl.due_date
     FROM payables pbl
     JOIN branch_subscriptions bs ON bs.branch_id = pbl.branch_id
     LEFT JOIN parties pt ON pt.id = pbl.party_id
     LEFT JOIN notifications n
       ON n.reference_type = 'payable'
      AND n.reference_id = pbl.id
      AND n.notification_type IN ('payable_due', 'payable_overdue')
      AND DATE(n.created_at) = CURDATE()
     WHERE pbl.balance_amount > 0
       AND pbl.due_date IS NOT NULL
       AND (pbl.due_date = CURDATE() OR pbl.due_date < CURDATE())
       AND bs.status IN ('active', 'trialing')
       AND (bs.current_period_ends_on IS NULL OR bs.current_period_ends_on >= CURDATE())
       AND n.id IS NULL`
  );

  // 3. Branch Subscription Expiry & Grace Reminders
  await query(
    `INSERT INTO notifications (branch_id, notification_type, reference_type, reference_id, title, message, due_date)
     SELECT bs.branch_id,
            CASE
              WHEN bs.status = 'expired' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND (bs.grace_ends_on IS NULL OR bs.grace_ends_on < CURDATE())) THEN 'subscription_expired'
              WHEN bs.status = 'grace' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND bs.grace_ends_on >= CURDATE()) THEN 'subscription_grace'
              ELSE 'subscription_expiring_soon'
            END,
            'subscription',
            bs.id,
            CASE
              WHEN bs.status = 'expired' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND (bs.grace_ends_on IS NULL OR bs.grace_ends_on < CURDATE())) THEN CONCAT('Subscription Expired: ', b.name)
              WHEN bs.status = 'grace' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND bs.grace_ends_on >= CURDATE()) THEN CONCAT('Grace Period: ', b.name)
              ELSE CONCAT('Expiring Soon: ', b.name)
            END,
            CONCAT(
              'Branch \"', b.name, '\" (', b.code, ') SaaS subscription is ',
              CASE
                WHEN bs.status = 'expired' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND (bs.grace_ends_on IS NULL OR bs.grace_ends_on < CURDATE())) THEN 'expired. Operational access for this branch is suspended.'
                WHEN bs.status = 'grace' OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on < CURDATE() AND bs.grace_ends_on >= CURDATE()) THEN 'in grace period. Please renew to prevent operational interruption.'
                ELSE 'expiring soon. Please renew promptly.'
              END
            ),
            COALESCE(bs.current_period_ends_on, bs.trial_ends_on)
     FROM branch_subscriptions bs
     JOIN branches b ON b.id = bs.branch_id
     LEFT JOIN notifications n
       ON n.reference_type = 'subscription'
      AND n.reference_id = bs.id
      AND n.notification_type IN ('subscription_expired', 'subscription_grace', 'subscription_expiring_soon')
      AND DATE(n.created_at) = CURDATE()
     WHERE (
       bs.status IN ('expired', 'grace')
       OR (bs.current_period_ends_on IS NOT NULL AND bs.current_period_ends_on <= DATE_ADD(CURDATE(), INTERVAL 3 DAY))
       OR (bs.trial_ends_on IS NOT NULL AND bs.trial_ends_on <= DATE_ADD(CURDATE(), INTERVAL 3 DAY))
     )
     AND n.id IS NULL`
  );
}

export function startReminderScheduler() {
  if (started) {
    return;
  }
  started = true;
  createReminderNotifications().catch((error) => {
    console.error("Failed to create notifications", error);
  });
  setInterval(() => {
    createReminderNotifications().catch((error) => {
      console.error("Failed to create notifications", error);
    });
  }, 60 * 60 * 1000);
}

