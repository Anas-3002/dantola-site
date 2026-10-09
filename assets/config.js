/* ============================================================================
   Dantola Dental Clinic - single-file site configuration.
   ----------------------------------------------------------------------------
   Everything an operator may need to change lives here: the WhatsApp inbox that
   receives every form, the phone number, the email, the address and the opening
   hours. This file is served with `Cache-Control: no-cache`, so an edit goes
   live on the next page refresh - no rebuild, no HTML surgery.

   The pages ship with the same values baked in as sensible defaults, and this
   file is merged over them at runtime.
   ========================================================================== */
window.DANTOLA_CONFIG = {
  /* Digits only, country code first - this is the inbox every form is sent to. */
  whatsapp: "923135524592",

  /* Display + dial values for the phone number. */
  phone: "+92 313 5524592",
  phoneDial: "+923135524592",

  email: "hello@dantola.com",

  clinic: "Dantola Dental Clinic",
  addressShort: "Ocean Tower, DHA Phase 6, Karachi",
  address: "Dantola Dental Clinic, 3rd Floor, Ocean Tower, Plot 12-A, Khayaban-e-Iqbal, DHA Phase 6, Karachi, Pakistan",
  mapsQuery: "Ocean Tower, Khayaban-e-Iqbal, DHA Phase 6, Karachi",

  hours: [
    { days: "Monday - Friday", time: "10:00 - 21:00" },
    { days: "Saturday", time: "10:00 - 18:00" },
    { days: "Sunday", time: "12:00 - 18:00" },
    { days: "Emergency care", time: "24/7 on call" }
  ],

  /* Leave a network blank ("") and its icon is hidden automatically, so the
     site never ships a dead social link. */
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: ""
  }
};
