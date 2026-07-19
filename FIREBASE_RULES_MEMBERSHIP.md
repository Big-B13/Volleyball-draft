# Membership access: Firebase rules note
The UI now keeps pending members out of drafts and admin pages. Before making the site public, also enforce the same idea in Firebase Realtime Database Rules. Client-side hiding is not database security.

At minimum, keep writes to `users/$uid` restricted to the matching authenticated UID, and use a trusted server/Admin SDK or carefully designed rules for commissioner approval. Firebase Realtime Database rules cannot safely determine a commissioner merely from client-provided profile data without rules designed around authenticated claims.

For this small private league, review the existing database rules before enabling public access. Never use unrestricted test-mode rules for a public deployment.
