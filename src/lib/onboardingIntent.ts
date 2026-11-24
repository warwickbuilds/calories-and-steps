/**
 * Hands a choice made on the last onboarding step to the main app.
 * Saving the profile swaps onboarding for the tabs, so onboarding can't
 * navigate onward itself; Today reads this once when it first appears.
 */

let importAfterOnboarding = false;

export function requestImportAfterOnboarding() {
  importAfterOnboarding = true;
}

/** True once, if the user asked to import their weight history during setup. */
export function takeImportRequest(): boolean {
  const wanted = importAfterOnboarding;
  importAfterOnboarding = false;
  return wanted;
}
