#!/bin/bash
# Build-output checks for drawn post images. Usage: hugo -d DIR && tests/build/bilder-check.sh DIR
P=$1; fail=0
chk() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
LISTS="$P/aktuelles/index.html $(ls $P/aktuelles/page/*/index.html 2>/dev/null)"
for b in 2026-08-21-schleifchenturnier-details 2026-09-13-rewe-scheine-fuer-vereine \
         2026-09-13-saisonfazit-sommer-2026 2026-03-23-mixed-teams-2026-aufruf \
         2026-04-06-platzinstandhaltung-sommer-2026 2026-04-14-korrektur-jahreshauptversammlung-2026 \
         2026-04-27-platzoeffnung-2026 fruehling-2026-ausblick; do
  chk "$b article image" "grep -q '/images/news/gezeichnet/$b.svg' $P/aktuelles/$b/index.html"
  chk "$b card image"    "grep -qh '/images/news/gezeichnet/$b.svg' $LISTS"
done
chk "vereinsnews own photo"    "grep -q 'fotos-2025-anlage/img-01.jpg' $P/aktuelles/2026-05-31-vereinsnews-kurz/index.html"
chk "vorstand own photo"       "grep -q 'news/vorstand-2026.png' $P/aktuelles/2026-05-31-vorstandswechsel-2026/index.html"
chk "meet-and-play own photo"  "grep -q 'news/meet-and-play.jpg' $P/aktuelles/2026-08-11-meet-and-play/index.html"
exit $fail
