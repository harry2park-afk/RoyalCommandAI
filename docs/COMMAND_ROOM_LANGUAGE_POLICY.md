# Command Room Language Policy

## Authoritative rule

The language selected by the customer in the Command Room language selector is the customer's persistent default language.

- The selected default language persists in the customer's account-backed UI preferences.
- The selector itself must not change automatically because the customer writes a question in another language.
- It remains the saved default until the customer manually selects a different language.
- For each individual message, the Command Room detects the language used in that question and every selected AI should answer in that detected language.
- Example: if the saved selector is English but the customer asks a question in Korean, the answer to that question is Korean while the selector remains English.
- If the current question's language is ambiguous, use the saved default language.
- Code, URLs, product names, proper nouns, and explicitly preserved source text may remain in their original form where appropriate.
