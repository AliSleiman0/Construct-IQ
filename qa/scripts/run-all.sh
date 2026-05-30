#!/usr/bin/env bash
# Run all QA scripts sequentially and print a grand total
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
FAILED_SUITES=()

SCRIPTS=(
  "01-auth.sh"
  "02-sa-dashboard.sh"
  "03-sa-organizations.sh"
  "04-sa-plans-features.sh"
  "05-sa-billing-tickets.sh"
  "06-org-dashboard.sh"
  "07-org-reports-projects.sh"
  "08-org-settings.sh"
  "09-org-support.sh"
  "10-org-billing-subscription.sh"
  "11-sa-org-admins.sh"
  "12-pm-tasks.sh"
  "13-pm-phases-milestones.sh"
  "14-pm-projects-detail.sh"
  "15-pm-issues.sh"
  "16-pm-reports.sh"
  "17-pm-dashboard.sh"
  "18-pm-budget.sh"
  "19-pm-procurement.sh"
  "20-pm-documents.sh"
)

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        ConstructIQ — Full QA Suite (curl/bash)               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

for script in "${SCRIPTS[@]}"; do
  SCRIPT_PATH="$DIR/$script"
  if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}[MISSING]${NC} $script — file not found, skipping"
    continue
  fi

  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Run script, capture output and exit code
  OUTPUT=$(bash "$SCRIPT_PATH" 2>&1)
  EXIT_CODE=$?

  echo "$OUTPUT"

  # Parse PASS/FAIL/SKIP from machine-readable QA_TOTALS line
  TOTALS_LINE=$(echo "$OUTPUT" | grep '^QA_TOTALS' | tail -1)
  PASS=$(echo "$TOTALS_LINE" | grep -o 'PASS:[0-9]*' | cut -d: -f2 || echo 0)
  FAIL=$(echo "$TOTALS_LINE" | grep -o 'FAIL:[0-9]*' | cut -d: -f2 || echo 0)
  SKIP=$(echo "$TOTALS_LINE" | grep -o 'SKIP:[0-9]*' | cut -d: -f2 || echo 0)

  PASS=${PASS:-0}
  FAIL=${FAIL:-0}
  SKIP=${SKIP:-0}

  TOTAL_PASS=$((TOTAL_PASS + PASS))
  TOTAL_FAIL=$((TOTAL_FAIL + FAIL))
  TOTAL_SKIP=$((TOTAL_SKIP + SKIP))

  if [ "$EXIT_CODE" -ne 0 ] || [ "$FAIL" -gt 0 ]; then
    FAILED_SUITES+=("$script (FAIL: $FAIL)")
  fi

  echo ""
done

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    GRAND TOTAL                               ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "║  ${GREEN}PASS: $TOTAL_PASS${NC}"
echo -e "║  ${RED}FAIL: $TOTAL_FAIL${NC}"
echo -e "║  ${YELLOW}SKIP: $TOTAL_SKIP${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
  echo -e "\n${RED}Failed suites:${NC}"
  for suite in "${FAILED_SUITES[@]}"; do
    echo -e "  ${RED}✗${NC} $suite"
  done
  echo ""
  exit 1
else
  echo -e "\n${GREEN}All suites passed.${NC}\n"
  exit 0
fi
