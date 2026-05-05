export function isSubscriberUnsubscribable(status: string): boolean {
  return status !== "blocked";
}
