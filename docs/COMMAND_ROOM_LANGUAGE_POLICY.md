# Command Room Language Policy

## Authoritative rule

The language selected by the customer in the Command Room language selector is the customer's persistent default display language.

- The selected language persists in the customer's account-backed UI preferences and browser language preference.
- The selector itself must not change automatically because a prompt is written in another language.
- It remains active until the customer manually selects a different language.
- The Royal Command homepage / front gate uses this selected default language for its visible customer-facing text.
- Korean and English homepage copy are available immediately; other supported selected locales may be translated and cached for reuse.
- Each individual chat question is language-detected independently. If the question is clearly written in a language different from the saved default, every selected AI answers that question in the detected question language.
- Example: saved selector = English, current question = Korean -> answer in Korean while selector and homepage default remain English.
- If the question language is ambiguous, use the saved selected default language.
- Code, URLs, product names, proper nouns, and explicitly preserved source text may remain in their original form where appropriate.
