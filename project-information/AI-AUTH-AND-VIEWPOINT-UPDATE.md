# AI authentication, allowance and viewpoint update

## Authentication

A configured key is not a verified connection. The interface now distinguishes configured, authenticated and rejected states. Whitespace around the key is trimmed; the launcher rejects quoted or malformed input without contacting OpenAI. Credentials remain local to the server process.

A provider 401 means authentication was rejected, not a general image/model error. Possible causes include invalid/revoked keys, project membership/permissions or IP restrictions. No credential repair can be verified without a provider request, so this update deliberately does not claim to fix the user's actual key. Restart with an active project key to test when authorised.

For new provider 401/403 responses, the associated local reservation is released. After a 401, further provider requests are blocked until restart. No automatic retries. Timeouts, ambiguous failures and previously recorded reservations are retained conservatively: no historical accounting is silently rewritten. The local ledger is not an invoice or an OpenAI credit balance.

## Cost

The $0.50 image reservation and $0.05 feedback reservation are conservative local safeguards, not actual prices. The $3 allowance is not a guaranteed provider billing cap. Images remain one low-quality 1024 × 1024 draft per explicit action, with confirmation and saved-image reuse. Official image documentation currently lists GPT Image 2 low-quality square image output at approximately $0.006, excluding text and image input. Actual usage and API billing must be checked separately.

## Viewpoint

The default is now an eye-level path perspective at 1.6 m, with a clipped perspective projection of drawn spaces and height-scaled vegetation. Elevated and side views remain available. Choose viewpoint on map: click within 5 m of a path to snap the eye position, then click a highlight at least 2 m away. The map shows the eye, direction line and target. Keyboard-accessible presets offer positions along each path and plot-centre/woody-plant targets.

Camera changes do not invalidate the planting plan or call AI. Coordinates are included in image prompts, request validation and image-cache keys. Moving the eye or target changes the free schematic and selects a different image-cache entry. This is still a schematic illustrative perspective, not a photorealistic renderer or survey-accurate model.

## Verification

Tests use isolated temporary ledgers and dummy credentials with fully intercepted provider responses. They check rejection refunds, the post-401 circuit breaker, safe error messages, camera validation and view changes. No user's key is used and no paid request is made.

Sources: [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes), [image generation and cost](https://developers.openai.com/api/docs/guides/image-generation).
