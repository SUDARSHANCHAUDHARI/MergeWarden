# Security policy

## Supported versions

Security fixes are provided for the latest tagged release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Email `sunny.sudarshan@gmail.com` with:

- the affected version;
- reproduction steps;
- expected impact;
- any suggested mitigation.

Do not include live tokens, private keys, private repository content, or customer data. You should receive an acknowledgement within seven days.

## Security boundaries

MergeWarden shells out to local `git`, `gh`, and explicitly configured verification commands without invoking a shell. Configuration is trusted local input and must be writable only by the profile owner. GitHub permissions come from the active `gh` login; use the least-privileged token or account suitable for the selected repositories.

MergeWarden does not store GitHub tokens. Audit logs contain repository names, PR numbers, decisions, reasons, and commit SHAs, but not credentials or diff content.
