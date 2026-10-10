/**
 * Shared attributes for the JWT session cookies.
 *
 * The client (Vercel) and the API (Render) are on different registrable
 * domains, so every request is cross-site. Browsers only attach a cookie to a
 * cross-site request when it was set with SameSite=None, and SameSite=None is
 * only accepted together with Secure. The previous Lax/insecure options meant
 * POST /auth/login returned 200 but GET /auth/me could never see the cookie,
 * so the client bounced back to the landing page with a 401 "unauthorized".
 *
 * In local development both apps run on localhost (same site over http), where
 * Secure cannot be used and Lax is sufficient, so the attributes differ by
 * environment.
 */
const { isProduction } = require('../helper/getEnVName.js');

/**
 * @returns {import('express').CookieOptions}
 */
function sessionCookieOptions() {
    return isProduction()
        ? { httpOnly: true, secure: true, sameSite: 'none', path: '/' }
        : { httpOnly: true, secure: false, sameSite: 'lax', path: '/' };
}

module.exports = { sessionCookieOptions };
