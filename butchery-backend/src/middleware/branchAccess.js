// Enforces that an attendant can only submit or query data for
// their OWN branch (from their token) — never someone else's.
// Admins bypass this check entirely, since they're meant to see
// and act on every branch.
//
// Usage: requireOwnBranch('branch_id', 'body')  — checks req.body.branch_id
//        requireOwnBranch('branch_id', 'query') — checks req.query.branch_id
//        requireOwnBranch('id', 'params')        — checks req.params.id
function requireOwnBranch(fieldName, source = 'body') {
    return (req, res, next) => {
        if (req.user.role === 'admin') return next();

        const value = req[source]?.[fieldName];
        // If the field wasn't provided at all, let the route's own
        // validation handle that — this middleware only checks
        // MISMATCHES, not missing fields.
        if (value === undefined || value === null || value === '') return next();

        if (Number(value) !== Number(req.user.branch_id)) {
            return res.status(403).json({
                error: 'You can only access data for your own branch',
            });
        }
        next();
    };
}

module.exports = requireOwnBranch;