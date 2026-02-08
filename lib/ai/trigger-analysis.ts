/** Fire-and-forget client-side trigger for AI ticket analysis */
export function triggerAnalysis(requestId: string) {
  fetch("/api/analyse-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  }).catch(() => {
    // Silently ignore — analysis is non-blocking
  });
}
