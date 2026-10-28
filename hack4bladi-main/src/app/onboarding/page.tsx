import { Suspense } from "react";
import { OnboardingFlow } from "@/features/onboarding";

export default function Page() {
  /* useSearchParams (the `?new` Inspiration tab) needs a boundary for prerendering. */
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}
