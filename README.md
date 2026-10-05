# Kashero

Kashero is a local-first point-of-sale app for a single coffee shop or retail store. It is built with Expo, React Native, and TypeScript, with Android and iOS as the primary platforms.

## Development

Use Node.js 22 LTS. From the project directory, install dependencies and start Expo:

```sh
npm install
npm start
```

Use `npm run android` or `npm run ios` to open the development server for a connected device or simulator. Native simulator builds require the relevant Android or Xcode tools on the host machine.

## Checks

```sh
npm test
npm run lint
npm run typecheck
```

## Project direction

The first release focuses on one store, staff login, product categories and variants, inventory, sales, cash payments, and manually recorded approval codes for separate Maya or Metrobank terminals. Local data will use SQLite. Cloud sync and model-specific printer support will be added in later tasks after their requirements are confirmed.
