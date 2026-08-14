# Royal Command Global GCP Rollout

## Current execution scope
This folder is the infrastructure-as-code starting point for the approved global rollout. It does not claim that GCP resources or DNS records already exist. Actual provisioning requires the Royal Command GCP project and credentials to be connected.

## Region map
- Global controller: royalcommand.ai / royalcommand.com
- US core: us-central1 primary, us-west1 secondary
- EU core: europe-west3 + europe-west4
- UK core: europe-west2 primary, europe-west1 secondary disaster-recovery region
- APAC core: australia-southeast1

Important: europe-west1 is Belgium, not Ireland. If an Ireland-specific GCP residency requirement is mandatory, choose a currently supported GCP location only after verifying the official region list and legal requirement.

## Availability pattern
1. Use regional services behind health-checked load balancers.
2. Prefer load-balancer failover for application traffic; use DNS failover as an additional layer, not the only HA mechanism.
3. Cloud DNS health-check failover can remove unhealthy external endpoints or forwarding rules. Keep TTL low enough for recovery while respecting resolver caching.
4. Cloudflare and Google Cloud DNS cannot both be authoritative primary DNS for the exact same zone at the same time. A dual-provider design must use deliberately synchronized secondary DNS/multi-provider authoritative architecture or delegated subzones, with tested rollback.
5. A >500 ms latency threshold should be treated as an application SLO/monitoring trigger; DNS health checks should use supported health-check criteria rather than assuming arbitrary client-side latency is directly enforceable at DNS level.

## Data residency
- EU raw/regulated data remains in EU storage/processing until an approved filtering/aggregation step produces exportable data.
- UK data follows the UK zone policy and approved data-transfer rules.
- Store secrets only in Secret Manager/KMS-backed systems; never in Terraform source or GitHub.
- Use service accounts with least privilege and separate identities per region/workload.

## Domains
Never modify DNS for royalcommand.com, atyourcommandai.com, CommandCanada.ca, royalcommand.eu, royalcommand.de, royalcommand.nl, royalcommand.co.uk, royalcommand.uk, or atyourcommandai.com.au until ownership and current authoritative DNS are verified.

## Next apply prerequisites
- GCP project ID and billing enabled
- Terraform execution identity / Workload Identity Federation
- Domain ownership and authoritative nameserver inventory
- Existing production endpoint inventory and rollback targets
- Approved storage retention and residency policy
- Cloudflare API access if Cloudflare is used in the final authoritative DNS design

## Voice AI
The repository currently does not contain a verified "System Prompt #1" or a connected Twilio/Retell control-plane tool. Do not invent or bind a US phone number until the exact number, agent, and approved prompt are confirmed in the telephony system.
