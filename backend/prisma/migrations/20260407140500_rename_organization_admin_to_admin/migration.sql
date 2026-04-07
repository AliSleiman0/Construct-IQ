-- Rename "Organization Admin" to "Admin".
-- Step 1: For orgs that already have an "Admin" role, migrate user_roles and
--         role_permissions away from the old "Organization Admin" row, then drop it.
-- Step 2: For orgs that don't yet have an "Admin" role, rename in place.

-- Step 1 – merge into existing "Admin"
DO $$
DECLARE
  oa RECORD;
  ea RECORD;
BEGIN
  FOR oa IN SELECT * FROM roles WHERE name = 'Organization Admin' LOOP
    SELECT * INTO ea FROM roles
    WHERE name = 'Admin' AND "organizationId" = oa."organizationId"
    LIMIT 1;

    IF FOUND THEN
      -- migrate user_roles (skip if user already has the Admin role)
      UPDATE user_roles SET "roleId" = ea.id
      WHERE "roleId" = oa.id
        AND NOT EXISTS (
          SELECT 1 FROM user_roles x
          WHERE x."roleId" = ea.id AND x."userId" = user_roles."userId"
        );
      DELETE FROM user_roles WHERE "roleId" = oa.id;

      -- migrate role_permissions (skip duplicates)
      UPDATE role_permissions SET "roleId" = ea.id
      WHERE "roleId" = oa.id
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions x
          WHERE x."roleId" = ea.id AND x."permissionId" = role_permissions."permissionId"
        );
      DELETE FROM role_permissions WHERE "roleId" = oa.id;

      DELETE FROM roles WHERE id = oa.id;
    END IF;
  END LOOP;
END;
$$;

-- Step 2 – rename remaining "Organization Admin" rows that have no conflict
UPDATE roles
SET name = 'Admin',
    description = 'Full control within own organization'
WHERE name = 'Organization Admin';
