-- Remove manage:organizations from all Admin roles
-- Admins can only read/update their OWN org; listing/creating/suspending orgs is Super Admin only.
DELETE FROM role_permissions
WHERE "roleId" IN (SELECT id FROM roles WHERE name = 'Admin')
  AND "permissionId" IN (SELECT id FROM permissions WHERE name = 'manage:organizations');
