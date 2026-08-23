export class Verifier {
  async verify(ctx) {
    if (!ctx.intent || !ctx.intent.requiresTools) {
      ctx.verified = true;
      return ctx;
    }

    const hasErrors = ctx.toolResults.some((r) => r.error);
    const hasPendingAuth = ctx.toolResults.some((r) => r.pendingAuthorization);

    if (hasErrors) {
      ctx.verified = false;
      ctx.verificationNote = 'One or more tool steps resulted in an error.';
    } else if (hasPendingAuth) {
      ctx.verified = false;
      ctx.verificationNote = 'Action pending user authorization.';
    } else {
      ctx.verified = true;
      ctx.verificationNote = 'All requested operations completed successfully.';
    }

    ctx.log('Verifier', `Verification verdict: ${ctx.verified ? 'PASS' : 'HOLD'}`, {
      note: ctx.verificationNote,
    });
    return ctx;
  }
}

export default Verifier;
