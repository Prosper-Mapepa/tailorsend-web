/** Common Greenhouse / OFCCP dropdown answers for profile + autofill. */

export const GENDER_OPTIONS = [
  "",
  "Male",
  "Female",
  "Non-binary",
  "Decline to self-identify",
] as const;

export const RACE_ETHNICITY_OPTIONS = [
  "",
  "Hispanic or Latino",
  "White (Not Hispanic or Latino)",
  "Black or African American (Not Hispanic or Latino)",
  "Asian (Not Hispanic or Latino)",
  "Native Hawaiian or Other Pacific Islander",
  "American Indian or Alaska Native",
  "Two or More Races",
  "Decline to self-identify",
] as const;

export const VETERAN_OPTIONS = [
  "",
  "I am not a protected veteran",
  "I identify as one or more of the classifications of a protected veteran",
  "Decline to self-identify",
] as const;

export const DISABILITY_OPTIONS = [
  "",
  "Yes, I have a disability",
  "No, I don't have a disability",
  "I don't wish to answer",
] as const;

export const HEAR_ABOUT_OPTIONS = [
  "",
  "LinkedIn",
  "Company website",
  "Referral",
  "Job board",
  "Indeed",
  "Glassdoor",
  "University career fair",
  "Other",
] as const;

export const YES_NO_OPTIONS = ["", "Yes", "No"] as const;
