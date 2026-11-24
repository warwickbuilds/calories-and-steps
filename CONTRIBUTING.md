# Contributing to Calories and Steps

Thanks for wanting to help. This is a small, personal app, so the bar is simple: keep it private, keep it simple, and keep the README true.

## Ways to help

- **Report a bug** with the [bug report form](https://github.com/warwickbuilds/calories-and-steps/issues/new?template=bug_report.yml). Say which version (Settings → About), which phone and Android version, and the steps to make it happen.
- **Suggest an idea** with the [feature request form](https://github.com/warwickbuilds/calories-and-steps/issues/new?template=feature_request.yml). Check [Future enhancements](README.md#future-enhancements) first; it may already be planned.
- **Send a pull request.** For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.
- **Security problems** go through [SECURITY.md](SECURITY.md), never a public issue.

## Ground rules

These are the app's standing rules. A PR that breaks one will be asked to change.

1. **Your data stays on your phone.** No accounts, no analytics, no tracking, no new servers. A new network call needs a clear reason and has to be listed in the README's [Services](README.md#services) and privacy sections.
2. **Say "calories", never "kcal"**, everywhere in the app and the docs.
3. **Green is only for steps and orange is only for calories.** Charts and everything else use neutral colours (see `src/theme/colors.ts`).
4. **Bring your own AI key.** AI features use the user's own key, stored in secure storage, and never in the database, a backup or a log.
5. **Every PR updates `README.md`** in the same PR: features, the changelog row, the version and dependency table if they change, architecture, services, maintenance steps and future enhancements. See [CLAUDE.md](CLAUDE.md).

## Setting up

You need Node 22, npm, and an Android phone or emulator. The app runs in an Expo development build (not Expo Go) because it uses native modules.

```bash
git clone https://github.com/warwickbuilds/calories-and-steps.git
cd calories-and-steps
npm install
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

More detail is in the README under [Running it](README.md#running-it), and [AGENTS.md](AGENTS.md) has notes on how Expo works in this SDK.

## Before you open a pull request

Run all four checks. CI runs the same ones on every pull request.

```bash
npm test
npm run typecheck
npm run lint
npx expo export -p android
```

- Put pure maths and formatting in `src/lib` with a test in `src/lib/__tests__`.
- Changing the database? Edit `src/db/schema.ts`, run `npm run db:generate`, and read the README's [Maintenance](README.md#maintenance) notes on migrations. Never edit a migration that has shipped. New tables must be added to the backup.
- Adding a package? Use `npx expo install <package>` so it matches the Expo SDK.
- Keep pull requests focused: one change per PR is easier to review and release.
- Fill in the pull request template, including screenshots (light and dark) for anything visual.

## Releases

Only the maintainer makes releases. The version in `app.json` and `package.json` is bumped in a PR, and a tagged release builds the signed APKs with GitHub Actions. See [Releases](README.md#releases).

## Code of conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
