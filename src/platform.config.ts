// ───────────────────────────────────────────────────────────────
// Platform settings — rename the product and set your contact
// details here. Everything else in the app reads from this file.
// ───────────────────────────────────────────────────────────────

export const PLATFORM = {
  /** Your agency / product name shown on the landing page and questionnaire */
  name: 'Demo Studio',
  tagline: {
    en: 'See your restaurant’s app working — before you pay a cent.',
    ar: 'شاهد تطبيق مطعمك يعمل — قبل أن تدفع أي شيء.',
  },
  /** WhatsApp number for the "Talk to us" buttons (digits only, with country code) */
  salesWhatsApp: '96100000000',
  salesEmail: 'hello@example.com',
  /**
   * Your two offers. ⚠️ PLACEHOLDER PRICES — set your real prices before showing clients.
   * Shown on the landing page, the commission calculator and each client's plan.
   */
  plans: {
    currency: 'USD',
    native: { price: 100, per: 'branch / month', setup: 0 },
    pwa: { price: 50, per: 'branch / month', setup: 0 },
  },
  /** How long a generated demo stays open */
  trialDays: 14,
  /**
   * Cloud lead database (Supabase). Every demo reports itself here so the
   * Sales console (#/sales) sees demos made on ANY phone or computer.
   * The sales passcode is checked on the server, not stored in this code.
   * Leave url empty to run fully offline (Sales console then shows this device only).
   */
  cloud: {
    url: 'https://tgrhopkylqcwhwtabptb.supabase.co',
    key: 'sb_publishable_uhdOULA0owOePhMTU2cwmw_GrTr3MxH',
  },
  /**
   * Optional: receive every questionnaire as a lead.
   * Paste a Formspree / Web3Forms / Make / Zapier / Google Apps Script URL.
   * The app POSTs the answers as JSON. Leave empty to disable.
   */
  leadWebhook: '',
};
