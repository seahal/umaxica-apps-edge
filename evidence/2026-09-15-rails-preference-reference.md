# Rails Preference reference audit — 2026-09-15

## Scope

The requested Rails commit
`7bee4819ffe2a402c63a04af2a368bfcaf253c0d` was fetched read-only into the
temporary bare repository `/tmp/umaxica-rails-reference.git`. No Rails working
copy, Rails process, database, migration, Edge remote or GitHub ref was changed.
The audit was static; Rails tests and runtime were not started.

## Files inspected

- `app/services/request_context_contract.rb`
- `app/controllers/concerns/preference_global.rb`
- `app/controllers/concerns/preference_localization.rb`
- `app/controllers/concerns/preference_base.rb`
- `app/controllers/concerns/preference_io_keys.rb`
- `app/controllers/concerns/preference_cookie_name.rb`
- `app/controllers/concerns/preference_cookie_writer.rb`
- `config/initializers/locale.rb`
- `test/services/request_context/contract_test.rb`
- `test/controllers/concerns/preference/global_test.rb`
- `test/controllers/concerns/preference/base_test.rb`
- `test/integration/preference_read_symmetry_test.rb`
- `adr/localization-preference-flow.md`
- `adr/theme-preference-cookie-and-param-contract.md`

## Confirmed facts

- Rails configures `I18n.available_locales` as `[:en, :ja]`.
- `PreferenceBase#normalized_locale` lowercases a nonblank value and accepts it
  only when it is in the available locale strings. Unsupported values return
  no locale.
- `PreferenceIoKeys::Cookies::LANGUAGE` and
  `PreferenceBase::LANGUAGE_COOKIE_KEY` are both `language`.
- `PreferenceGlobal` treats `lx` as an optional request-local context value.
  It normalizes it, drops an invalid value, and lets valid request context
  override persisted request context for that request.
- `RequestContextContract` defines `ri` as the required region key, allows
  `jp` and `us`, and defaults to `jp`. It lowercases overlay values; its
  `tf`, `mo` and `dn` aliases are unrelated to the Edge locale decision.
- `PreferenceLocalization` chooses Rails' own I18n locale from
  `Actor.preferences` and the Rails default. The Rails integration tests state
  that the JS-readable `language` cookie is a write-only mirror for the browser,
  not a second Rails preference source.

## Edge decision

These facts are enough to review the requested Edge display precedence:
valid `lx`, then a valid Rails `language` Cookie, then `ja`. Edge must treat the
value as display context only, must not decode a Preference JWT, and must not
send the Cookie or its value as an authentication credential.

The route integration remains on hold. The current twelve public units use
`/{lang}/` as the route and as the canonical, hreflang and sitemap URL. Applying
the new query precedence to `/ja/?lx=en` would render English content under a
Japanese path while query canonical adoption is still undecided. Moving to an
`lx` URL requires one reviewed SEO migration covering canonical, hreflang,
sitemap, old-path redirects and finite invalid-query cleanup. That review is
separate from this reference audit and was not silently implemented.

## Reproduction commands

```text
git init --bare /tmp/umaxica-rails-reference.git
git --git-dir=/tmp/umaxica-rails-reference.git fetch --no-tags \
  https://github.com/seahal/umaxica-apps-jit-global.git \
  7bee4819ffe2a402c63a04af2a368bfcaf253c0d
```

The fetch completed successfully and the listed paths were read with
`git show FETCH_HEAD:<path>`. No remote write or push was attempted.
