export function getResourceShareUrl(origin: string, resourceId: string) {
  return new URL(`/resources/${resourceId}`, origin).toString();
}
