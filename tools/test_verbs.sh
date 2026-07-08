#!/bin/bash
# Test suite do Makaitricks — relatório automatizado com categorias e tempos
# Uso: bash tools/test_verbs.sh

MAKAI="/home/cas/Documentos/Makai-forge/data/install-api/Makaitricks"
WINE="/usr/bin/wine"
LOG_DIR="/tmp/verb_logs"
REPORT="/tmp/makaitricks_report.txt"
mkdir -p "$LOG_DIR"

# ── Categorias ────────────────────────────────────────
declare -A CATEGORIES
CATEGORIES["vcrun6"]="VC++ Runtime"
CATEGORIES["vcrun2003"]="VC++ Runtime"
CATEGORIES["vcrun2005"]="VC++ Runtime"
CATEGORIES["vcrun2008"]="VC++ Runtime"
CATEGORIES["vcrun2010"]="VC++ Runtime"
CATEGORIES["vcrun2012"]="VC++ Runtime"
CATEGORIES["vcrun2013"]="VC++ Runtime"
CATEGORIES["vcrun2015"]="VC++ Runtime"
CATEGORIES["vcrun2017"]="VC++ Runtime"
CATEGORIES["vcrun2019"]="VC++ Runtime"
CATEGORIES["vcrun2022"]="VC++ Runtime"
CATEGORIES["vcrun6sp6"]="VC++ Runtime"
CATEGORIES["d3dx9"]="DirectX / Media"
CATEGORIES["d3dx10"]="DirectX / Media"
CATEGORIES["d3dx11_43"]="DirectX / Media"
CATEGORIES["d3dcompiler_47"]="DirectX / Media"
CATEGORIES["d3dxof"]="DirectX / Media"
CATEGORIES["d3drm"]="DirectX / Media"
CATEGORIES["dxdiagn"]="DirectX / Media"
CATEGORIES["directplay"]="DirectX / Media"
CATEGORIES["dinput"]="DirectX / Media"
CATEGORIES["dinput8"]="DirectX / Media"
CATEGORIES["dsound"]="DirectX / Media"
CATEGORIES["quartz"]="DirectX / Media"
CATEGORIES["mf"]="DirectX / Media"
CATEGORIES["dinputto8"]="DirectX"
CATEGORIES["cnc_ddraw"]="DirectX"
CATEGORIES["wmp9"]="Media Player"
CATEGORIES["wmp10"]="Media Player"
CATEGORIES["wmp11"]="Media Player"
CATEGORIES["allcodecs"]="Codecs"
CATEGORIES["ffdshow"]="Codecs"
CATEGORIES["lavfilters"]="Codecs"
CATEGORIES["cinepak"]="Codecs"
CATEGORIES["icodecs"]="Codecs"
CATEGORIES["l3codecx"]="Codecs"
CATEGORIES["ogg"]="Codecs"
CATEGORIES["wmv9vcm"]="Codecs"
CATEGORIES["xvid"]="Codecs"
CATEGORIES["windowscodecs"]="Codecs"
CATEGORIES["directshow"]="DirectShow"
CATEGORIES["xact"]="Audio"
CATEGORIES["xaudio29"]="Audio"
CATEGORIES["faudio"]="Audio"
CATEGORIES["openal"]="Audio"
CATEGORIES["dsoal"]="Audio"
CATEGORIES["mdx"]="Audio"
CATEGORIES["dotnet_verifier"]=".NET Framework"
CATEGORIES["dotnet11"]=".NET Framework"
CATEGORIES["dotnet11sp1"]=".NET Framework"
CATEGORIES["dotnet20"]=".NET Framework"
CATEGORIES["dotnet20sp1"]=".NET Framework"
CATEGORIES["dotnet20sp2"]=".NET Framework"
CATEGORIES["dotnet30"]=".NET Framework"
CATEGORIES["dotnet30sp1"]=".NET Framework"
CATEGORIES["dotnet35"]=".NET Framework"
CATEGORIES["dotnet35sp1"]=".NET Framework"
CATEGORIES["dotnet40"]=".NET Framework"
CATEGORIES["dotnet40_kb2468871"]=".NET Framework"
CATEGORIES["dotnet45"]=".NET Framework"
CATEGORIES["dotnet452"]=".NET Framework"
CATEGORIES["dotnet46"]=".NET Framework"
CATEGORIES["dotnet461"]=".NET Framework"
CATEGORIES["dotnet462"]=".NET Framework"
CATEGORIES["dotnet471"]=".NET Framework"
CATEGORIES["dotnet472"]=".NET Framework"
CATEGORIES["dotnet48"]=".NET Framework"
CATEGORIES["dotnet6"]=".NET Framework"
CATEGORIES["dotnetdesktop6"]=".NET Framework"
CATEGORIES["dotnet7"]=".NET Framework"
CATEGORIES["dotnetdesktop7"]=".NET Framework"
CATEGORIES["dotnet8"]=".NET Framework"
CATEGORIES["dotnetdesktop8"]=".NET Framework"
CATEGORIES["dotnet9"]=".NET Framework"
CATEGORIES["dotnetdesktop9"]=".NET Framework"
CATEGORIES["dotnet10"]=".NET Framework"
CATEGORIES["dotnetdesktop10"]=".NET Framework"
CATEGORIES["dotnetcore2"]=".NET Framework"
CATEGORIES["dotnetcore3"]=".NET Framework"
CATEGORIES["dotnetcoredesktop3"]=".NET Framework"
CATEGORIES["mfc42"]="MFC Libraries"
CATEGORIES["mfc71"]="MFC Libraries"
CATEGORIES["mfc80"]="MFC Libraries"
CATEGORIES["mfc90"]="MFC Libraries"
CATEGORIES["mfc100"]="MFC Libraries"
CATEGORIES["mfc110"]="MFC Libraries"
CATEGORIES["mfc120"]="MFC Libraries"
CATEGORIES["mfc140"]="MFC Libraries"
CATEGORIES["msxml3"]="System Libraries"
CATEGORIES["msxml4"]="System Libraries"
CATEGORIES["msxml6"]="System Libraries"
CATEGORIES["riched20"]="System Libraries"
CATEGORIES["riched30"]="System Libraries"
CATEGORIES["winhttp"]="System Libraries"
CATEGORIES["uiautomationcore"]="System Libraries"
CATEGORIES["xna40"]="System Libraries"
CATEGORIES["cabinet"]="Sistema / Utilitários"
CATEGORIES["cmd"]="Sistema / Utilitários"
CATEGORIES["wsh57"]="Sistema / Utilitários"
CATEGORIES["ie8"]="Sistema / Utilitários"
CATEGORIES["physx"]="Sistema / Utilitários"
CATEGORIES["xinput"]="Sistema / Utilitários"
CATEGORIES["gdiplus"]="Sistema / Utilitários"
CATEGORIES["corefonts"]="Sistema / Utilitários"
CATEGORIES["tahoma"]="Sistema / Utilitários"
CATEGORIES["webview2"]="Sistema / Utilitários"
CATEGORIES["dxvk"]="Sistema / Utilitários"
CATEGORIES["vkd3d"]="Sistema / Utilitários"
CATEGORIES["dxvk_nvapi"]="Translation Layer"
CATEGORIES["dxvk_async"]="Translation Layer"

# Ordem dos testes
ORDER=(
  vcrun6 vcrun2003 vcrun2005 vcrun2008 vcrun2010 vcrun2012 vcrun2013
  vcrun2015 vcrun2017 vcrun2019 vcrun2022 vcrun6sp6
  d3dx9 d3dx10 d3dx11_43 d3dcompiler_47 d3dxof d3drm dxdiagn directplay
  dinput dinput8 dsound quartz mf
  dinputto8 cnc_ddraw
  wmp9 wmp10 wmp11
  allcodecs ffdshow lavfilters cinepak icodecs l3codecx ogg wmv9vcm xvid windowscodecs
  directshow
  xact xaudio29 faudio openal dsoal mdx
  dotnet_verifier dotnet11 dotnet11sp1 dotnet20 dotnet20sp1 dotnet20sp2
  dotnet30 dotnet30sp1 dotnet35 dotnet35sp1 dotnet40 dotnet40_kb2468871
  dotnet45 dotnet452 dotnet46 dotnet461 dotnet462 dotnet471 dotnet472
  dotnet48 dotnet6 dotnetdesktop6 dotnet7 dotnetdesktop7 dotnet8 dotnetdesktop8
  dotnet9 dotnetdesktop9 dotnet10 dotnetdesktop10
  dotnetcore2 dotnetcore3 dotnetcoredesktop3
  mfc42 mfc71 mfc80 mfc90 mfc100 mfc110 mfc120 mfc140
  msxml3 msxml4 msxml6 riched20 riched30 winhttp uiautomationcore xna40
  cabinet cmd wsh57 ie8 physx xinput gdiplus corefonts tahoma webview2
  dxvk vkd3d dxvk_nvapi dxvk_async
)

# ── Engine de teste ──────────────────────────────────
PASS=0 FAIL=0 TOTAL=0
declare -A CAT_PASS CAT_FAIL CAT_TOTAL

test_verb() {
    local verb="$1"
    local prefix="${HOME}/tmp/test_${verb}"
    rm -rf "$prefix" 2>/dev/null

    local logfile="${LOG_DIR}/${verb}.log"
    local start end elapsed

    start=$(date +%s)
    WINEPREFIX="$prefix" WINE="$WINE" WINEARCH=win64 \
        timeout 600 "$MAKAI" "$verb" > "$logfile" 2>&1
    local rv=$?
    end=$(date +%s)
    elapsed=$((end - start))

    TOTAL=$((TOTAL + 1))

    local cat="${CATEGORIES[$verb]:-Outros}"
    CAT_TOTAL[$cat]=$((CAT_TOTAL[$cat] + 1))

    if [ $rv -eq 0 ] && ! grep -qi "w_die" "$logfile"; then
        PASS=$((PASS + 1))
        CAT_PASS[$cat]=$((CAT_PASS[$cat] + 1))
        printf "  %-25s ✅  (%ds)\\n" "$verb" "$elapsed"
    else
        FAIL=$((FAIL + 1))
        CAT_FAIL[$cat]=$((CAT_FAIL[$cat] + 1))
        local reason="exit=$rv"
        grep -qi "w_die" "$logfile" && reason="w_die"
        printf "  %-25s ❌  %s (%ds)\\n" "$verb" "$reason" "$elapsed"
    fi

    rm -rf "$prefix" 2>/dev/null
}

# ── Relatório ─────────────────────────────────────────
generate_report() {
    local date_str
    date_str=$(date "+%d/%m/%Y %H:%M")

    cat > "$REPORT" <<EOF
═══════════════════════════════════════════════════════════════
               MAKAITRICKS — RELATÓRIO DE TESTES
═══════════════════════════════════════════════════════════════

  Data: ${date_str}
  Status: ${TOTAL} verbs testados | ${PASS} PASS | ${FAIL} FAIL | $(( (PASS * 100) / TOTAL ))% precisão

EOF

    # Categorias
    local cats_sorted=()
    for c in "${!CAT_TOTAL[@]}"; do
        cats_sorted+=("$c")
    done
    IFS=$'\n' cats_sorted=($(sort <<<"${cats_sorted[*]}")); unset IFS

    for c in "${cats_sorted[@]}"; do
        local t=${CAT_TOTAL[$c]}
        local p=${CAT_PASS[$c]:-0}
        local f=${CAT_FAIL[$c]:-0}
        printf "  📊 %-22s → %2d ✅  %d ❌\n" "$c" "$p" "$f" >> "$REPORT"
    done

    cat >> "$REPORT" <<EOF

EOF

    # Detalhamento por verbo
    for c in "${cats_sorted[@]}"; do
        echo "  ── $c ──" >> "$REPORT"
        for v in "${ORDER[@]}"; do
            [ "${CATEGORIES[$v]}" != "$c" ] && continue
            local logfile="${LOG_DIR}/${v}.log"
            local elapsed=0
            if [ -f "$logfile" ]; then
                local rv=0
                grep -qi "w_die" "$logfile" && rv=1
                # rough time estimate from log size for the report
            fi
            if [ -f "$logfile" ] && ! grep -qi "w_die" "$logfile"; then
                echo "    ✅ $v" >> "$REPORT"
            else
                echo "    ❌ $v" >> "$REPORT"
            fi
        done
        echo "" >> "$REPORT"
    done

    cat >> "$REPORT" <<EOF
═══════════════════════════════════════════════════════════════
  📁 knowledge/index.json v2 — ${TOTAL} verbs
  📁 tools/test_verbs.sh     — script reproduzível
  📁 data/install-api/README.md — documentação completa
═══════════════════════════════════════════════════════════════
EOF

    cat "$REPORT"
}

# ── Main ──────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Makaitricks — Test Suite"
echo "  $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

for v in "${ORDER[@]}"; do
    test_verb "$v"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  GERANDO RELATÓRIO..."
echo "═══════════════════════════════════════════════════════════════"

generate_report

echo ""
echo "Relatório salvo em: $REPORT"
echo ""
