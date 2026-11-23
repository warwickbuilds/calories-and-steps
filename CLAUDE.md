# Working on this repo

Read `AGENTS.md` for Expo rules and `README.md` for how the app is built.

## Keep the README current (standing rule from Rick)

Every pull request updates `README.md` in the same PR. Before opening or updating a PR, check and edit each section the change touches:

- **Status** and **Features**: what works now, phase by phase.
- **Versions and changelog**: add a row for the PR. Update the app version and the dependency table when they change.
- **Architecture**: new screens, tables, migrations, folders or patterns.
- **Services**: any new outside service, key or permission, and when it is used.
- **Maintenance**: new steps for building, upgrading, migrating or releasing.
- **Future enhancements**: add every idea for later that comes up in discussion, and remove items once they ship.

## Other rules

- The app says "calories", never "kcal".
- Green is only for steps and orange only for calories.
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npx expo export` before a PR.
