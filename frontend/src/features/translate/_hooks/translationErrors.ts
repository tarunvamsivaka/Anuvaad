export const INTERRUPTED_MESSAGE =
  "The connection was interrupted. Your input is still here; select Try again to retry.";

export const PROVIDER_FAILURE_MESSAGE =
  "The translation service could not complete this request. Your input is still here; select Try again to retry.";

export function getHttpFailureMessage(status: number): string {
  if (status === 401) return "Your sign-in may have expired. Sign in again, then retry.";
  if (status === 403) return "This request is not available for your account.";
  if (status === 413) return "This input is too large. Shorten it and try again.";
  if (status === 400 || status === 422) return "Please check your input and try again.";
  if (status >= 500) {
    return "The translation service is temporarily unavailable. Your input is still here; try again shortly.";
  }
  return "The request could not be completed. Your input is still here; try again.";
}
