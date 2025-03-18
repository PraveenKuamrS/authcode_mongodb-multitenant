"use strict";

const roles = {
    superAdmin: {
        actions: ["manage", "Create", "Update", "Read", "Delete"],
        modules: ["Students",]
    },
    admin: {
        actions: ["manage", "Create", "Update", "Read", "Delete"],
        modules: ["User",]
    },
    manager: {
        actions: ["manage", "Create", "Update", "Read"],
        modules: []
    },


};

/**
 * Middleware for checking if the user has permission to perform an action on a module.
 * @param {string} action - The action to be performed (e.g., "Create", "Read").
 * @param {string} module - The module on which the action is performed (e.g., "User", "Media").
 */
function can(action, module) {
    return (req, res, next) => {
        const userPermissions = roles[req.user.role];
        if (userPermissions.actions.includes(action) && userPermissions.modules.includes(module)) {
            next();
        } else {
            return res.status(403).json({ error: 'Access Denied' });
        }
    };
}

/**
 * Middleware for verifying that the user's tenant ID matches the requested tenant.
 */

function verifyTenant(req, res, next) {
    // Check if the user is a super admin
    if (req.user.role === 'superAdmin') {
        // For super admin, allow the request without tenant validation
        return next();
    }
    // For other roles (admin, user, manager), validate the tenant
    const requestedTenantId = req.header('TenantId');
    if (!requestedTenantId || req.user.tenantId !== requestedTenantId) {
        return res.status(403).json({ error: 'Tenant Mismatch' });
    }

    next();
}


module.exports = {
    can,
    verifyTenant,
    roles
};
