# Meta Paid Ads Planner — ROAS Edition

## How to run (Mac)
1) Install Node.js LTS from https://nodejs.org (if you don't already have it).
2) Open Terminal in this folder and run:
   ```bash
   bash run.sh
   ```
3) Open http://localhost:3000

Notes:
- Telemetry is disabled during local runs.
- The script automatically runs `npm audit fix` (and `--force` if needed) to reduce vulnerability warnings.

This edition replaces ROI with ROAS = (Total Funds Raised ÷ Ad Spend) × 100.
