INSERT INTO permissions (id, name, resource, action, description, "createdAt")
VALUES (gen_random_uuid(), 'manage:company', 'company', 'manage', 'Full access within own organization', NOW())
ON CONFLICT (name) DO NOTHING;

DELETE FROM role_permissions
WHERE "roleId" IN (SELECT id FROM roles WHERE name = 'Admin');

INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' AND p.name = 'manage:company'
ON CONFLICT DO NOTHING;
