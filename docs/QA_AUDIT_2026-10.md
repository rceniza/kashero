# Kashero end-to-end workflow audit

**Date:** 2026-10-06  
**Build:** Expo development client from `main` at `b188765`  
**Test devices:** iPhone SE (2nd generation), 375 pt, iOS 26.4; iPad mini (A17 Pro), iOS 26.4

## Live workflow results

| Area | Device and path | Outcome |
| --- | --- | --- |
| Sign-in | iPhone SE 2: cold launch, invalid password, then valid password | Both outcomes reached the expected UI. Invalid credentials were shown inline and appeared in local diagnostics. The PBKDF2 check took over one minute in this debug simulator run; release-device performance remains unmeasured. |
| Catalog | iPhone SE 2: submit an empty category, then create a category | Invalid submit showed inline validation. A valid category appeared in the refreshed category list. No explicit success message or screen-reader announcement appeared after saving. |
| Inventory | iPhone SE 2: receive two units with a note | Stock increased from 19 to 21; the attributed movement appeared in recent history. No separate success message was shown. Manual correction review/cancel/confirm was live-tested on this device and iPad mini for Task 15. |
| Cash checkout | iPhone SE 2: create a sale, tender too little, then tender enough | The insufficient amount displayed an inline explanation and stayed pending. The failed payment attempt remained recorded. A later cash payment settled the sale, showed ₱0.50 change, and opened the receipt preview. |
| Terminal checkout | iPad mini: create a sale, record a Maya decline, then record approval code `MAYA73` | The decline remained visible; the approved attempt settled the sale. SQLite contained both attempts, linked to the sale and signed-in user. This was app-side manual recording, not a physical terminal integration test. |
| Diagnostics | iPhone SE 2: open Logs after invalid login | The `auth.login.failed` event was visible. Technical diagnostics remain distinct from expected payment outcomes and business records. |
| Tablet layout | iPad mini: catalog plus order panel and payment sheet | The split catalog/order layout and wide payment sheet rendered and supported the tested Maya flow. |

Previous live validations remain recorded in the delivery plan: tax settings on phone/tablet (Task 14), receipt/terminal paths (Task 10), diagnostics export (Task 11), and correction review on phone/tablet (Task 15). The printer still uses the unconfigured adapter because its model is unconfirmed.

## Transaction records and feedback

Completed sales and their lines are stored in `sales` and `sale_items`; cash and terminal attempts/outcomes are stored in `payments`; stock changes are stored in `inventory_movements` with the responsible user. Live SQLite inspection confirmed that an insufficient cash tender and a subsequent paid tender both remained associated with the same receipt, and that a Maya decline and subsequent approved payment were both retained. Inventory movements are visible in the app. There is currently no in-app sales/payment history screen after checkout is dismissed.

Diagnostics record handled technical errors with redacted metadata and bounded local retention. They are not a duplicate ledger of successful operations, and expected declines/insufficient tenders are represented by payment records rather than technical errors. Catalog/category edits do not have actor-attributed history.

Checkout exposes pending, paid, declined, and cancelled states. Auth, catalog, inventory, and settings errors are shown inline; tax settings also shows an explicit success message. Catalog and inventory success is currently signaled by updated list/history content rather than a dedicated confirmation. Success text is not consistently announced to screen readers. Routine POS outcomes should use accessible in-app feedback; there is no need for a push notification for each sale.

## Findings and follow-up work

1. Measure sign-in latency on a release-like build and minimum supported hardware. The observed delay was on a debug simulator and does not prove release performance. Preserve the configured password-hash work factor while investigating.
2. Add consistent, accessible success feedback for catalog and inventory saves while retaining inline validation and failure messages.
3. Add read-only sales/payment history so users can retrieve prior receipts, attempts, and outcomes after checkout closes.
4. Provide a WAL-safe local backup/restore workflow and verify restored databases with `PRAGMA integrity_check`.
5. Update README claims that still describe the app as an in-memory prototype.
6. Settle remaining launch rules for shifts, discounts, voids, refunds, returns, weighed goods, and role permissions before implementing those flows.

## Verification and limits

`npm run check` passed: 29 suites / 76 tests, lint, and typecheck. `npm run db:check` and `git diff --check` passed. Test owners, products, categories, payments, and stock changes were temporary. Both simulators were restored from verified pre-test snapshots after stopping the apps and clearing SQLite `-wal`, `-shm`, and journal sidecars. Each restored database returned `ok` from `PRAGMA integrity_check`, retained its original owner account, and had zero payment rows.

This audit did not repeat Android 11 or minimum-iOS runtime checks. Task 12 previously covered limited Android API 30 startup, POS, and order-sheet flows; that is not a full Android transaction audit. No physical bank terminal or printer was attached. iOS 16.4 runtime behavior and release-build login performance remain unverified.
