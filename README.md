# Kashero

Kashero is a point-of-sale app for a small, single-location shop. It is being built with coffee shops in mind, while keeping the catalog flexible enough for groceries and other retail items. The goal is to make everyday counter work—finding an item, taking payment, and keeping stock accurate—straightforward on a phone or tablet.

The app is local-first: its working data lives in a SQLite database on the device. That keeps the core checkout flow independent of an internet connection and avoids requiring a server to open the register. Cloud backup and syncing are future work; they are not part of the current app.

## Where the project is today

Kashero is an actively developed application, not just a screen mockup. The current app includes:

- First-run setup for an owner account, followed by username-and-password sign-in.
- A product catalog with categories, products, variants, prices, and optional SKU or barcode values.
- Stock counts and recorded inventory movements, including restocks, sales, returns, and corrections.
- A checkout flow that creates a sale, records payment, and shows a receipt preview.
- Cash payments with tendered amount and change calculation.
- Manual recording of Maya or Metrobank terminal results, including approval code, optional terminal reference, declines, and cancellations.
- Store tax settings and a diagnostics screen for recent application errors.

Some surrounding workflows are still being built. There is not yet a complete sales-history screen, owner-managed staff-account flow, local backup and restore flow, or cloud sync. The supported roles are owner, manager, and cashier, but the final permission policy is still being settled.

Kashero does not connect to a bank terminal or printer yet. For a terminal payment, the customer pays on the bank's separate terminal and the cashier records the result in Kashero. Receipt preview is available, but Bluetooth printing is not configured because the printer model has not been confirmed. The app does not currently communicate with a server or upload store data.

## A typical first-use flow

1. Launch Kashero. On a new database, create the store's owner account.
2. Sign in, add product categories and products, and enter opening stock.
3. Build an order from the catalog and review the total.
4. Choose cash and enter the amount received, or choose the terminal used and record its approval code after the bank terminal approves the payment.
5. Review the receipt on screen. Printing and later retrieval from a sales-history screen are still pending.

Tax is off until the store configures a rate. Kashero does not select a tax rate on the store's behalf.

## Technology

- **Expo SDK 57, React Native 0.86, and TypeScript** provide the iOS and Android app.
- **Expo SQLite and Drizzle ORM** store and query local data. Schema migrations live in `drizzle/`.
- **React Native Quick Crypto** performs password derivation through native asynchronous PBKDF2 while preserving the existing password-hash format.
- **Bun 1.3.10** manages JavaScript dependencies and runs project scripts. **Node.js 22.13 or newer, but below 23**, remains required by the Expo and React Native tooling.
- **Jest and React Native Testing Library** cover unit and feature behavior.

The database is designed for one store on one device at a time. Entity records use UUID primary keys (the single store-settings row has a fixed key), and monetary values are stored as whole centavos to avoid floating-point currency calculations. The main tables are users, product categories, products, variants, inventory, inventory movements, store settings, sales, sale items, payments, and diagnostic logs. See [`src/data/db/schema.ts`](src/data/db/schema.ts) for the full schema.

## Get started

Install Bun 1.3.10 and Node.js 22.13–22.x first. Clone the repository, install the exact dependency set recorded in the Bun lockfile, and start Expo:

```sh
git clone https://github.com/rceniza/kashero.git
cd kashero
bun install --frozen-lockfile
bun run start
```

For a native build, use a development machine with the platform tools installed:

```sh
bun run ios
bun run android
```

Building for iOS requires macOS, Xcode, and CocoaPods. Building for Android requires Android Studio and the Android SDK. The project sets Android's minimum SDK to API 30 (Android 11) and the iOS deployment target to 16.4. Expo Go is not sufficient because password hashing uses native code; use the native development build created by the commands above.

When adding an Expo dependency, use Expo's version-aware installer so it can select a version compatible with this SDK:

```sh
bunx expo install PACKAGE_NAME
```

Replace `PACKAGE_NAME` with the dependency you need, then commit the updated `bun.lock` with the package change.

## Run checks

Run all automated checks:

```sh
bun run check
```

Or run an individual check:

```sh
bun run test
bun run lint
bun run typecheck
bun run db:check
```

`bun run test` runs the Jest unit and feature suites. Lint checks `src/`; typecheck runs TypeScript without emitting files. `bun run db:check` checks the Drizzle schema and migrations.

Docker provides the same Node 22 and Bun 1.3.10 environment used for automated checks:

```sh
docker compose run --build --rm kashero
```

For example, run only the tests inside the container with:

```sh
docker compose run --rm kashero bun run test
```

The Compose volume caches JavaScript dependencies to speed up later runs. Docker is only used here for development checks; the mobile app does not store its SQLite data in Docker. Use the host commands for simulator or physical-device testing. A macOS container cannot directly access the host iOS Simulator, Android device, Bluetooth printer, or bank terminal.

## Where to look in the code

- `src/app/` contains the Expo Router entry point and app layout.
- `src/features/` contains the user-facing workflows and their services: authentication, catalog, inventory, point of sale, payments, receipts, diagnostics, and settings.
- `src/data/` contains the SQLite repositories that implement those feature interfaces.
- `src/data/db/` contains the Drizzle schema and database initialization.
- `drizzle/` contains versioned database migrations.
- `src/components/`, `src/shared/`, and `src/theme/` contain reusable UI, layout helpers, and design tokens.
- `__tests__/unit/` and `__tests__/features/` contain unit and feature tests.

Features are split into services and repositories so business rules can be tested independently of SQLite and screens can share consistent behavior.

## Data, transactions, and diagnostics

Sales, sale items, payments, inventory balances, and inventory movements are saved in the device's local SQLite database. These records provide the operational data for checkout and stock tracking. Kashero also keeps a separate diagnostics log for application events and failures; that log is intended to help investigate problems and is not a replacement for payment or sales records.

Diagnostics metadata is redacted before storage and export. The diagnostics screen can export recent logs for troubleshooting. Do not treat a diagnostics export as a database backup. A supported backup-and-restore workflow has not been added yet, so plan to preserve the device and app data until that feature exists.

## Current platform and hardware limits

- Android's configured minimum is API 30 / Android 11. A live Android 11 validation still needs to be completed.
- iOS's configured minimum is 16.4. The iPhone SE 2 simulator has been used for release-build and sign-in checks on iOS 26.4; iOS 16.4 itself has not been checked yet.
- The exact Bluetooth thermal printer model and protocol are not confirmed, so printing is not connected.
- Maya and Metrobank are recorded as manual terminal tenders. Kashero does not initiate or verify a card transaction with either bank.
- There is no multi-store support, cloud sync, or automated cloud backup.
- Web is not a supported or validated POS target; iOS and Android are the focus.

## Contributing

Keep changes focused, readable, and covered by the relevant unit and feature tests. Before calling a task complete, run the automated checks and perform a live device check when the change affects native behavior or a user workflow. Record unavailable device or hardware validation in the project plan rather than marking it complete prematurely.
