#!/bin/bash
# Build-output checks for the April fool. Usage: hugo -d DIR && tests/build/april-check.sh DIR
P=$1; fail=0
# "neue Farben" is unique to the reveal page description (shown on news cards, not in the banner)
chk() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
chk "reveal page exists"            "test -f $P/aprilscherz/index.html"
chk "reveal page noindex"           "grep -q 'name=\"robots\" content=\"noindex\"' $P/aprilscherz/index.html"
chk "not in aktuelles list"         "! grep -q 'neue Farben' $P/aktuelles/index.html"
chk "not in sitemap"                "! grep -q aprilscherz $P/sitemap.xml"
chk "banner on homepage"            "grep -q 'class=\"april-banner\"' $P/index.html"
chk "hero title has april name"     "grep -q 'class=\"april-name\">Rot</span>' $P/index.html"
chk "banner on team page"           "grep -q 'class=\"april-banner\"' $P/mannschaften/herren-40/index.html"
chk "no banner on impressum"        "! grep -q 'class=\"april-banner\"' $P/seiten/impressum/index.html"
chk "no banner on datenschutz"      "! grep -q 'class=\"april-banner\"' $P/seiten/datenschutz/index.html"
chk "no banner on anmeldung"        "! grep -q 'class=\"april-banner\"' $P/verein/anmeldung/index.html"
chk "no banner on reveal page"       "! grep -q 'class=\"april-banner\"' $P/aprilscherz/index.html"
chk "not in homepage lists"         "! grep -q 'neue Farben' $P/index.html"
exit $fail
