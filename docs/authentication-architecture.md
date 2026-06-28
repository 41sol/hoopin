Agnostic B2B Identity & Authorization Architecture
==================================================

This blueprint defines a highly scalable, secure, and identity-provider (IdP) agnostic architecture for a B2B sports/academic SaaS platform.

1\. High-Level System Topography
--------------------------------

The system consists of four primary decoupling layers. By cleanly separating identity from business domain authorization, you can change your underlying IdP with minimal backend code modification.

```
+-------------------------------------------------------------+
|                     1. Client Tier (Web App)                |
|  Initiates auth with Academy Context -> Receives JWT Token  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|               2. Identity Provider (IdP)                    |
|  - Authenticates User (Email/Password only; sign-up off)    |
|  - Resolves Academy/Roles/Teams to Custom JWT Claims        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 3. Application Backend (API)                |
|  - Validates Cryptographic Signature of incoming JWT        |
|  - Middleware extracts [Academy ID], [Roles], [Teams]       |
|  - Policy Engine evaluates request context                  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              4. Core Relational Database (SQL)              |
|  - Stores Domain Entities (Academy, Team, Player Records)   |
|  - Evaluates fine-grained contextual queries                |
+-------------------------------------------------------------+

```

2\. Relational Domain & Database Model
--------------------------------------

To prevent token bloat and secure fine-grained access (especially when users belong to multiple teams with varying permissions), your core application database must hold the relational source-of-truth.

### Entity-Relationship Diagram (ERD) Schema

We represent this mathematically: let $U$ be the set of Users, $A$ be the set of Academies, and $T$ be the set of Teams such that $T_a \subset T$ represents the teams belonging to academy $a \in A$.

```
+-------------------+
|      Academies    |
|-------------------|
| id (PK)           |<---------+
| name              |          |
| created_at        |          |
+-------------------+          |
                               |
+-------------------+          | (One-to-Many)
|       Users       |          |
|-------------------|          |
| id (PK / IdP Sub) |          |
| email             |          |
| name              |          |
+-------------------+          |
  |                            |
  | (One-to-Many)              |
  v                            |
+------------------------------------+
|         Academy_Memberships        |
|------------------------------------|
| id (PK)                            |
| user_id (FK -> Users.id)           |
| academy_id (FK -> Academies.id)----+
| role (Enum: coach, scout, player)  |<---------+
| status (Enum: active, invited)     |          |
+------------------------------------+          |
  |                                             |
  | (One-to-Many)                               | (One-to-Many)
  v                                             |
+------------------------------------+          |
|          Team_Assignments          |          |
|------------------------------------|          |
| id (PK)                            |          |
| membership_id (FK -> Memb.id)      |          |
| team_id (FK -> Teams.id)-----------|--+       |
+------------------------------------+  |       |
                                        |       |
+-------------------+                   |       |
|       Teams       |                   |       |
|-------------------|                   |       |
| id (PK)           |<------------------+       |
| academy_id (FK)---|---------------------------+
| name              |
+-------------------+

```

### Key Normalization Constraints:

1.  **Academy Boundaries:** A team $t$ must always exist within exactly one academy $a$:

    $$\forall t \in T, \exists! a \in A \text{ such that } \text{parent}(t) = a$$
2.  **Scoped Memberships:** A user $u$ can have at most one role and status record *per academy*:

    $$\text{UniqueIndex}(user\_id, academy\_id)$$
3.  **Implicit Hierarchy Enforcement:** A user cannot be assigned to team $t \in T_a$ unless they hold an active membership in academy $a$.

3\. Provisioning & Sign-Up Lifecycles (Invite-Only)
---------------------------------------------------

Because self-registration is strictly disabled, user accounts and memberships must follow an invite-based administrative routing flow.

```
[Admin Dashboard] -> Creates Invite
                       |
                       v
[App Backend] -> 1. Inserts Academy_Membership (status: 'invited')
              -> 2. Creates User in IdP (via Admin SDK/API)
              -> 3. Triggers IdP Invite Email with set-password link
                       |
                       v
[User Inbox]  -> Clicks link -> Redirects to Secure Universal Login
              -> Establishes Password (IDP handles Verification)
                       |
                       v
[App Backend] -> Hook/Webhook listens for first login -> Flips status to 'active'

```

4\. Agnostic Token Architecture (JWT Payload)
---------------------------------------------

Regardless of the selected IdP, your application client must receive a cryptographically signed Access Token (JWT) that maps identity and tenancy context cleanly.

The JWT must contain standard RFC claims, along with custom namespaced authorization properties.

### Standard JWT Payload Template

```
{
  "iss": "https://auth.yoursaasdomain.com/",
  "sub": "auth0|user_1234567890",
  "aud": "https://api.yoursaasdomain.com",
  "iat": 1715600000,
  "exp": 1715603600,
  "scope": "openid profile email",

  "https://yoursaasdomain.com/active_academy_id": "academy_barcelona",
  "https://yoursaasdomain.com/roles": ["coach"],
  "https://yoursaasdomain.com/teams": ["u18_elite", "u16_development"]
}

```

5\. Multi-Tenant Frontend Context Routing
-----------------------------------------

Because users can belong to multiple academies (e.g., Coach in Academy A, Parent in Academy B), your routing strategy must allow switching domains cleanly.

### Approach: URL-Parsed Academy Context

-   Use path-based tenant targeting: `https://app.myapp.com/:academy_slug/dashboard`

-   **Flow:**

    1.  Frontend boots at `/academy_barcelona/dashboard`.

    2.  If unauthenticated, the application redirects the user to the IdP.

    3.  The frontend passes `academy_barcelona` (or its resolved database ID) as a parameter (`ext-academy_id` in Auth0, or direct `org_id` in native B2B tools).

    4.  The IdP processes the custom sign-in page.

    5.  The resulting token strictly scopes the authorization array claims to `academy_barcelona`.

6\. Backend Authorization Policy Engine (PEP)
---------------------------------------------

The application backend operates as the Policy Enforcement Point. The middleware decodes, cryptographically validates the token against the IdP's JWKS (JSON Web Key Set), and exposes a structured security context to downstream routes.

### Agnostic Middleware Execution Pattern (TypeScript Pseudocode)

```
import { Request, Response, NextFunction } from 'express';
import jwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';

export interface SecurityContext {
  userId: string;
  activeAcademyId: string;
  roles: string[];
  assignedTeams: string[];
}

// 1. JWT Signature and Issuer Validation
export const validateJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://auth.yoursaasdomain.com/.well-known/jwks.json`
  }),
  audience: 'https://api.yoursaasdomain.com',
  issuer: 'https://auth.yoursaasdomain.com/',
  algorithms: ['RS256']
});

// 2. Security Context Hydration Middleware
export const hydrateSecurityContext = (req: Request, res: Response, next: NextFunction) => {
  const token = req.user as any; // Hydrated by validateJwt

  if (!token) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // Parse claims in an identity-agnostic way
  const namespace = 'https://yoursaasdomain.com';

  req.securityContext = {
    userId: token.sub,
    activeAcademyId: token[`${namespace}/active_academy_id`] || token.org_id,
    roles: token[`${namespace}/roles`] || token.org_roles || [],
    assignedTeams: token[`${namespace}/teams`] || []
  };

  next();
};

```

### Fine-Grained Guard Implementations

You can now easily write reusable permission decorators or wrapper routes depending on the operational resource level.

#### Level 1: Academy Check (Coarse)

Verify the request resource belongs to the current tenant.

```
export const requireAcademyAccess = (req: Request, res: Response, next: NextFunction) => {
  const { activeAcademyId } = req.securityContext;
  const targetAcademyId = req.params.academyId;

  if (activeAcademyId !== targetAcademyId) {
    return res.status(403).json({ error: 'Access denied: Tenant mismatch' });
  }
  next();
};

```

#### Level 2: Role Check (Medium)

Ensure the user has high-level permissions for operations like invites or reports.

```
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { roles } = req.securityContext;
    const hasRole = roles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permission levels' });
    }
    next();
  };
};

```

#### Level 3: Team Check (Fine-Grained Contextual)

Enforce access limits for coaches or players managing specific schedules, statistics, or feedback.

```
export const requireTeamAccess = (req: Request, res: Response, next: NextFunction) => {
  const { assignedTeams, roles } = req.securityContext;
  const targetTeamId = req.params.teamId;

  // Administrators and global academy scouts bypass granular team checks
  if (roles.includes('admin') || roles.includes('scout')) {
    return next();
  }

  // Coaches and players are strictly confined to their assigned team set
  const isAssigned = assignedTeams.includes(targetTeamId);
  if (!isAssigned) {
    return res.status(403).json({ error: 'Resource locked: You are not assigned to this team' });
  }

  next();
};

```