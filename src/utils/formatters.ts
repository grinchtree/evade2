export function formatPermissions(permissions: string[]): string {
  return permissions
    .map((perm) => {
      return perm
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "");
    })
    .join(", ");
}
