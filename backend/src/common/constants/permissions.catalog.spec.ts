import {
  PERMISSIONS,
  PERMISSION_CATALOG,
  allPermissionNames,
} from './permissions';

/**
 * Guards the seam that broke once already: `OrganizationsService.create()`
 * filters every role's grants against the names present in the `permissions`
 * collection, and that collection is seeded from PERMISSION_CATALOG. A key
 * declared in PERMISSIONS but missing from the catalog is therefore silently
 * stripped from every org provisioned through the API — which is how the
 * `inspections` permissions went missing for non-seed orgs.
 */
describe('PERMISSION_CATALOG', () => {
  const catalogNames = new Set(PERMISSION_CATALOG.map((p) => p.name));

  it('has a row for every permission declared in PERMISSIONS', () => {
    const missing = allPermissionNames().filter((n) => !catalogNames.has(n));
    expect(missing).toEqual([]);
  });

  it('declares no row that PERMISSIONS does not export', () => {
    const declared = new Set(allPermissionNames());
    const orphans = PERMISSION_CATALOG.map((p) => p.name).filter(
      (n) => !declared.has(n),
    );
    expect(orphans).toEqual([]);
  });

  it('contains no duplicate names', () => {
    expect(catalogNames.size).toBe(PERMISSION_CATALOG.length);
  });

  it('keeps every row consistent with its `action:resource` name', () => {
    const mismatched = PERMISSION_CATALOG.filter(
      (p) => p.name !== `${p.action}:${p.resource === '*' ? 'all' : p.resource}`,
    );
    expect(mismatched).toEqual([]);
  });

  it('covers the inspections keys that regressed', () => {
    expect(catalogNames.has(PERMISSIONS.INSPECTIONS.READ)).toBe(true);
    expect(catalogNames.has(PERMISSIONS.INSPECTIONS.CREATE)).toBe(true);
    expect(catalogNames.has(PERMISSIONS.INSPECTIONS.UPDATE)).toBe(true);
    expect(catalogNames.has(PERMISSIONS.INSPECTIONS.MANAGE)).toBe(true);
  });
});
