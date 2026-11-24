# Security policy

## Supported versions

Only the [latest release](https://github.com/warwickbuilds/calories-and-steps/releases/latest) gets fixes. The app tells you when a new version is out, so please update before reporting.

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Anything older | No |

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Use GitHub's private reporting instead: open the repo's [Security tab](https://github.com/warwickbuilds/calories-and-steps/security) and choose **Report a vulnerability**. Only the maintainer can see it.

Please include:

- The app version (Settings → About), phone model and Android version
- What the problem is and what someone could do with it
- Steps to reproduce it, or a proof of concept

You should hear back within a week. Once a fix is released, you'll be credited in the changelog if you'd like.

## What's in scope

Things we especially want to hear about:

- Anything that sends your data (meals, weights, measurements, photos, steps) somewhere it shouldn't go
- Ways to read the AI key out of secure storage, or to leak it into a backup, log or crash report
- A crafted backup file that writes outside the app's folders or corrupts data on restore
- Release APKs that aren't signed with the published certificate
- Anything in the GitHub Actions release workflow that could expose its secrets

Out of scope: problems that need a rooted phone or physical access to an unlocked phone, and issues in Google AI, Open Food Facts, Health Connect or GitHub themselves (report those to them).

## How the project keeps secrets out of the repo

- **No secrets are committed.** The repo and its history have been checked. API keys are never in the code: each user brings their own Google AI key, which is kept in the phone's secure storage (Android Keystore) and only sent to Google.
- **The release signing key is never committed.** `*.jks`, `*.p12`, `*.p8`, `*.key` and `*.pem` are in `.gitignore`. The keystore only lives in GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64` and friends) and in the maintainer's offline backups.
- **Release builds check their own signature.** When `ANDROID_CERT_SHA256` is set, the workflow refuses to publish an APK signed with any other key.
- Pull request builds from forks get no secrets and are signed with a throwaway debug key, so they can't be installed over a real release.

## Checking a download

Every release is signed with the same key. Its certificate SHA-256 is:

```
07aea4df8cd30a8827dce11db1083b4ded20f0a36a98d58120da397011ae18c8
```

You can check an APK with `apksigner verify --print-certs calories-and-steps-<version>-arm64.apk` (from the Android SDK build tools) and compare the `SHA-256 digest` line.
