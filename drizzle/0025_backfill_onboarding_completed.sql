UPDATE "users"
SET "onboardingCompleted" = true
WHERE "onboardingCompleted" IS NULL OR "onboardingCompleted" = false;
