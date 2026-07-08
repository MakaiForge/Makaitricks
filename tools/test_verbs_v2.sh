#!/bin/bash
# Test suite v2 do Makaitricks — teste real com wine, log estruturado
# Uso: bash tools/test_verbs_v2.sh [verb1 verb2 ...]

MAKAI="/home/cas/Documentos/Makai-forge/data/install-api/Makaitricks"
WINE="/usr/bin/wine"
LOG_DIR="/tmp/makaitricks_test_logs"
REPORT="/tmp/makaitricks_report_v2.txt"
CSV="/tmp/makaitricks_results.csv"
ERROR_LOG="/tmp/makaitricks_errors.txt"
mkdir -p "$LOG_DIR"
rm -f "$CSV" "$ERROR_LOG"

PASS=0 FAIL=0 TOTAL=0
TIMEOUT=0  # sem timeout — cada verb leva o tempo que precisar

echo "verb,status,exit_code,elapsed,error_type,detail" > "$CSV"

test_verb() {
    local verb="$1"
    local prefix
    prefix=$(mktemp -d "/tmp/wine_test_${verb}_XXXXXX")
    
    local logfile="${LOG_DIR}/${verb}.log"
    local start end elapsed rv error_type detail

    start=$(date +%s)
    if [ "$TIMEOUT" -gt 0 ]; then
        WINEPREFIX="$prefix" WINE="$WINE" WINEARCH=win64 \
            timeout "$TIMEOUT" "$MAKAI" "$verb" > "$logfile" 2>&1
    else
        WINEPREFIX="$prefix" WINE="$WINE" WINEARCH=win64 \
            "$MAKAI" "$verb" > "$logfile" 2>&1
    fi
    rv=$?
    end=$(date +%s)
    elapsed=$((end - start))

    TOTAL=$((TOTAL + 1))

    # Analisar resultado
    error_type=""
    detail=""
    
    if grep -qi "w_die" "$logfile"; then
        error_type="W_DIE"
        detail=$(grep -i "w_die" "$logfile" | head -3 | tr '\n' ';')
        FAIL=$((FAIL + 1))
        printf "  %-25s ❌ W_DIE  (%ds) %s\\n" "$verb" "$elapsed" "${detail:0:80}"
    elif [ $rv -eq 124 ]; then
        error_type="TIMEOUT"
        detail="Timeout após ${TIMEOUT}s"
        FAIL=$((FAIL + 1))
        printf "  %-25s ❌ TIMEOUT (%ds)\\n" "$verb" "$elapsed"
    elif [ $rv -ne 0 ]; then
        error_type="EXIT_$rv"
        detail="exit code $rv"
        FAIL=$((FAIL + 1))
        printf "  %-25s ❌ EXIT_$rv (%ds)\\n" "$verb" "$elapsed"
    elif grep -qi "download.*fail\|curl.*fail\|wget.*fail\|sha256.*mismatch\|HTTP.*404\|Connection refused\|Name or service not known" "$logfile"; then
        error_type="DOWNLOAD_FAIL"
        detail=$(grep -i "download.*fail\|curl.*fail\|wget.*fail\|sha256.*mismatch\|404" "$logfile" | head -3 | tr '\n' ';')
        FAIL=$((FAIL + 1))
        printf "  %-25s ❌ DL_FAIL (%ds) %s\\n" "$verb" "$elapsed" "${detail:0:80}"
    else
        PASS=$((PASS + 1))
        printf "  %-25s ✅  (%ds)\\n" "$verb" "$elapsed"
    fi

    echo "$verb,$([ $FAIL -eq $((TOTAL - PASS)) ] && echo "FAIL" || echo "PASS"),$rv,$elapsed,\"$error_type\",\"$detail\"" >> "$CSV"
    
    if [ "$error_type" != "" ]; then
        echo "[$error_type] $verb (${elapsed}s): $detail" >> "$ERROR_LOG"
    fi

    rm -rf "$prefix" 2>/dev/null
}

# Se argumentos passados, testa só esses
if [ $# -gt 0 ]; then
    for v in "$@"; do
        test_verb "$v"
    done
else
    # Testar todos os 55 do index.json
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Makaitricks — Test Suite v2"
    echo "  $(date)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    VERBS=(
        # VCRun
        vcrun6 vcrun2003 vcrun2005 vcrun2008 vcrun2010 vcrun2012 vcrun2013
        vcrun2015 vcrun2017 vcrun2019 vcrun2022
        # DirectX
        d3dx9 d3dx10 d3dx11_43 d3dcompiler_47 d3dxof d3drm dxdiagn directplay
        dinput dinput8 dsound quartz mf
        # .NET
        dotnet40 dotnet48 dotnet9 dotnetdesktop9 dotnet10 dotnetdesktop10
        # Audio
        xact xaudio29 faudio openal
        # MFC
        mfc42 mfc71 mfc80 mfc90 mfc100 mfc110 mfc120 mfc140
        # System
        cabinet cmd wsh57 ie8
        physx xinput gdiplus corefonts tahoma webview2
        # Graphics
        dxvk vkd3d
        # Legacy
        jet40
    )

    for v in "${VERBS[@]}"; do
        test_verb "$v"
    done

    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  RESULTADO: ${TOTAL} verbs | ${PASS} PASS | ${FAIL} FAIL"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Logs:     $LOG_DIR/"
    echo "CSV:      $CSV"
    echo "Erros:    $ERROR_LOG"
    echo "Relatório: $REPORT"
    echo ""

    if [ -f "$ERROR_LOG" ]; then
        echo "═══════ FALHAS ═══════"
        cat "$ERROR_LOG"
    fi
fi
