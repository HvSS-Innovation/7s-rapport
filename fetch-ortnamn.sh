#!/bin/bash
# Hämta alla sjöar och öar från Lantmäteriet Ortnamn Direkt
BASE="https://api.lantmateriet.se/distribution/produkter/ortnamn/v2.2/kriterier"
USER="nijoda@gmail.com"

echo "Ange ditt Geotorget-lösenord:"
read -s PASS
echo ""

mkdir -p raw

# Funktion: hämta alla sidor för en sökning
fetch_all() {
    local PREFIX=$1  # filnamnsprefix
    local NAMN=$2    # sökord
    local TYPE=$3    # namntyp (URL-encoded)
    local OFFSET=0

    while true; do
        local FILE="raw/${PREFIX}_${OFFSET}.xml"
        curl -s -u "$USER:$PASS" -H "Accept: application/xml" \
            --data-urlencode "namn=$NAMN" \
            --data-urlencode "match=contains" \
            --data-urlencode "namntyp=$TYPE" \
            --data-urlencode "maxHits=400" \
            --data-urlencode "offset=$OFFSET" \
            -G "$BASE" -o "$FILE"

        COUNT=$(grep -c '<OrtnamnMember>' "$FILE" 2>/dev/null || echo 0)
        echo "  $PREFIX offset=$OFFSET -> $COUNT"

        if [ "$COUNT" -lt 400 ]; then break; fi
        OFFSET=$((OFFSET + 400))
        sleep 0.5
    done
}

echo "=== Sjöar ==="
# Sök på vanliga sjönamn-suffixer
fetch_all "sjo_sjo" "sjö" "Hav och sjö"
fetch_all "sjo_vatten" "vatten" "Hav och sjö"
fetch_all "sjo_trask" "träsk" "Hav och sjö"
fetch_all "sjo_tjarn" "tjärn" "Hav och sjö"
fetch_all "sjo_vik" "vik" "Hav och sjö"
fetch_all "sjo_fjard" "fjärd" "Hav och sjö"
fetch_all "sjo_an" "ån" "Hav och sjö"
fetch_all "sjo_alv" "älv" "Hav och sjö"
fetch_all "sjo_sund" "sund" "Hav och sjö"
fetch_all "sjo_damm" "damm" "Hav och sjö"
fetch_all "sjo_gol" "göl" "Hav och sjö"
fetch_all "sjo_pool" "pool" "Hav och sjö"
fetch_all "sjo_hav" "hav" "Hav och sjö"

echo ""
echo "=== Öar ==="
fetch_all "oar_on" "ön" "Natur- och terrängnamn"
fetch_all "oar_holme" "holme" "Natur- och terrängnamn"
fetch_all "oar_holmen" "holmen" "Natur- och terrängnamn"
fetch_all "oar_skar" "skär" "Natur- och terrängnamn"
fetch_all "oar_o" "ö" "Natur- och terrängnamn"
fetch_all "oar_grund" "grund" "Natur- och terrängnamn"
fetch_all "oar_kobbe" "kobbe" "Natur- och terrängnamn"
fetch_all "oar_udde" "udde" "Natur- och terrängnamn"
fetch_all "oar_nas" "näs" "Natur- och terrängnamn"
fetch_all "oar_land" "land" "Natur- och terrängnamn"

echo ""
echo "Klart! Kör nu i vanliga terminalen:"
echo "  node parse-ortnamn-all.js"
