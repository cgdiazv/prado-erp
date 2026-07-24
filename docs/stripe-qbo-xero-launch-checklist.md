# Stripe + QBO/Xero Launch Checklist

Use this checklist before deploying online invoice payments to production.

## 1) Environment and Platform Setup

- [ ] Verify Stripe platform account has Connect fully enabled.
- [ ] Verify Stripe Connect platform profile is completed (loss responsibilities, required profile fields).
- [ ] Confirm environment keys match mode:
  - [ ] `STRIPE_SECRET_KEY` uses `sk_test_...` in test or `sk_live_...` in production.
  - [ ] `STRIPE_WEBHOOK_SECRET` matches the Stripe webhook endpoint for this environment.
  - [ ] `STRIPE_CONNECT_WEBHOOK_SECRET` matches the Stripe Connect webhook endpoint for this environment.
- [ ] Confirm app URL env vars are correct (`NEXT_PUBLIC_APP_URL` or `APP_BASE_URL`).

## 2) Database and Migrations

- [ ] Run migration for Stripe Connect org fields.
- [ ] Run migration for invoice Stripe payment fields:
  - `stripe_checkout_session_id`
  - `stripe_payment_url`
  - `stripe_payment_status`
  - `paid_at`
- [ ] Verify columns exist in production database.

## 3) Stripe Webhook Configuration (Pending Item)

Set up both webhook endpoints in Stripe Dashboard:

- [ ] Endpoint A: `https://www.pradojob.com/api/webhooks/stripe`
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.async_payment_succeeded`
  - [ ] `checkout.session.async_payment_failed`

- [ ] Endpoint B: `https://www.pradojob.com/api/webhooks/stripe-connect`
  - [ ] `account.updated`

- [ ] Confirm each endpoint has the correct signing secret in env.
- [ ] Send test events from Stripe dashboard and verify HTTP 200 responses.

## 4) Plan and Feature Gating

- [ ] Confirm Stripe Connect appears for `trial`, `growth`, and `enterprise`.
- [ ] Confirm Stripe Connect is hidden/blocked for `individual`.
- [ ] Confirm online payment links are not generated for `individual` invoices.

## 5) End-to-End Functional Test (Test Mode)

- [ ] Subscriber connects Stripe via Integrations > Stripe Connect.
- [ ] Refresh status shows charges and payouts enabled.
- [ ] Complete a job that creates an invoice.
- [ ] Invoice email includes "Pay Invoice Online" button when eligible.
- [ ] Customer pays through Stripe checkout link.
- [ ] Invoice automatically changes to `paid` in Prado.
- [ ] `stripe_payment_status` updates to `paid` and `paid_at` is set.
- [ ] Subscriber receives "invoice paid" confirmation email.
- [ ] Xero queue receives post-payment invoice sync entry.
- [ ] QBO sync is triggered post-payment.

## 6) Regression Checks

- [ ] Legacy subscription checkout flow still updates organization subscription status.
- [ ] Existing billing/dashboard pages load normally.
- [ ] Integrations page works for both EN and ES routes.

## 7) Rollout

- [ ] Deploy code + migrations.
- [ ] Re-verify webhook secrets after deploy.
- [ ] Run one production smoke test with a low-value invoice.
- [ ] Monitor logs for webhook errors for 24 hours.
