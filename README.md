# Kashero

Kashero is a local-first point-of-sale app for a single coffee shop or retail store. It is built with Expo, React Native, and TypeScript, with Android and iOS as the primary platforms.

## Development

Use Node.js 22 LTS. From the project directory, install dependencies and start Expo:

```sh
npm install
npm start
```

Use `npm start` to start Metro. Use `npm run android` or `npm run ios` to build and launch the native app on a connected device or simulator; these commands require the Android SDK or Xcode and CocoaPods on the host machine.

## Checks

```sh
npm test
npm run lint
npm run typecheck
```

## Docker checks

Docker provides a consistent Node 22 environment for automated checks. Build the image and run the complete check set (unit tests, feature smoke tests, lint, and type checking) with:

```sh
docker compose run --build --rm kashero
```

Run an individual command in the same environment, for example `docker compose run --rm kashero npm test`. Rebuild after changing dependencies with `docker compose build --no-cache`; remove the cached dependency volume with `docker compose down --volumes` if it needs a clean reinstall.

Use the host Expo commands (`npm start`, `npm run ios`, or `npm run android`) for simulator and physical-device testing. Docker on macOS does not provide direct access to the host iOS Simulator, Android SDK/emulator, Bluetooth printer, or bank terminal. A containerized Metro server can also advertise an address that a phone cannot reach, so use the host Metro server for reliable live device testing.

## Project direction

The first release focuses on one store, staff login, product categories and variants, inventory, sales, cash payments, and manually recorded approval codes for separate Maya or Metrobank terminals. Local data will use SQLite. Cloud sync and model-specific printer support will be added in later tasks after their requirements are confirmed.
