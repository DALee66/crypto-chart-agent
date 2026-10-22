#!/usr/bin/env python3
"""Fetch live Hyperliquid + ETH gas context for Decision Desk."""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.request
from typing import Any


HL = "https://api.hyperliquid.xyz/info"
ETH_RPC = "https://ethereum.publicnode.com"


def post_json(url: str, payload: dict[str, Any]) -> Any:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "crypto-chart-agent/decision-desk"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_asset(symbol: str) -> dict[str, Any]:
    meta, ctxs = post_json(HL, {"type": "metaAndAssetCtxs"})
    universe = meta["universe"]
    idx = next(i for i, u in enumerate(universe) if u["name"].upper() == symbol.upper())
    ctx = ctxs[idx]
    mid = float(ctx["midPx"])
    prev = float(ctx["prevDayPx"])
    funding = float(ctx["funding"])
    premium = float(ctx["premium"])
    impact = ctx.get("impactPxs") or [None, None]
    return {
        "symbol": universe[idx]["name"],
        "midPx": mid,
        "markPx": float(ctx["markPx"]),
        "oraclePx": float(ctx["oraclePx"]),
        "prevDayPx": prev,
        "dayChangePct": ((mid - prev) / prev * 100) if prev else None,
        "dayNotionalVolumeUsd": float(ctx["dayNtlVlm"]),
        "openInterest": float(ctx["openInterest"]),
        "funding": funding,
        "fundingAnnualizedPct": funding * 24 * 365 * 100,
        "premiumBps": premium * 10_000,
        "impactBid": float(impact[0]) if impact[0] is not None else None,
        "impactAsk": float(impact[1]) if impact[1] is not None else None,
        "maxLeverage": universe[idx].get("maxLeverage"),
    }


def fetch_candles(symbol: str, interval: str = "15m", hours: int = 48) -> list[dict[str, float]]:
    end = int(time.time() * 1000)
    start = end - hours * 3600 * 1000
    raw = post_json(
        HL,
        {
            "type": "candleSnapshot",
            "req": {"coin": symbol, "interval": interval, "startTime": start, "endTime": end},
        },
    )
    return [
        {
            "t": float(r["t"]),
            "o": float(r["o"]),
            "h": float(r["h"]),
            "l": float(r["l"]),
            "c": float(r["c"]),
            "v": float(r["v"]),
        }
        for r in raw
    ]


def rsi(closes: list[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    gains = losses = 0.0
    for i in range(len(closes) - period, len(closes)):
        d = closes[i] - closes[i - 1]
        if d >= 0:
            gains += d
        else:
            losses -= d
    if losses == 0:
        return 100.0
    rs = gains / losses
    return 100 - 100 / (1 + rs)


def paper_long(candles: list[dict[str, float]]) -> dict[str, Any]:
    wins = losses = 0
    pnl = 0.0
    for i in range(1, len(candles)):
        entry = candles[i - 1]["c"]
        exit_ = candles[i]["c"]
        if entry <= 0:
            continue
        ret = (exit_ - entry) / entry * 100
        pnl += ret
        if ret >= 0:
            wins += 1
        else:
            losses += 1
    n = wins + losses
    return {
        "trades": n,
        "wins": wins,
        "losses": losses,
        "winRatePct": round(wins / n * 100, 1) if n else 0,
        "paperPnlPct": round(pnl, 2),
    }


def fetch_gas_gwei() -> float | None:
    try:
        data = post_json(ETH_RPC, {"jsonrpc": "2.0", "method": "eth_gasPrice", "params": [], "id": 1})
        return int(data["result"], 16) / 1e9
    except Exception:
        return None


def recommendation(asset: dict[str, Any]) -> dict[str, Any]:
    mid = asset["midPx"]
    step = max(abs(mid - asset["prevDayPx"]) * 0.35, mid * 0.003)
    bid = asset["impactBid"] or mid * 0.999
    ask = asset["impactAsk"] or mid * 1.001
    return {
        "buy": {
            "entry": bid,
            "stop": bid - step * 1.2,
            "targets": [bid + step, bid + step * 2],
        },
        "sell": {
            "entry": ask,
            "stop": ask + step * 1.2,
            "targets": [ask - step, ask - step * 2],
        },
        "disclaimer": "Ориентиры с live mid/impact. Не финансовый совет.",
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--symbol", default="BTC")
    p.add_argument("-o", "--output", default="-")
    args = p.parse_args()
    sym = args.symbol.upper()

    asset = fetch_asset(sym)
    candles = fetch_candles(sym)
    closes = [c["c"] for c in candles]
    gas = fetch_gas_gwei()
    paper = paper_long(candles)
    rsi_v = round(rsi(closes), 1)

    score = 0.5 + (50 - rsi_v) / 200 + max(-0.08, min(0.08, (asset["dayChangePct"] or 0) / 100))
    score = max(0.05, min(0.95, score))
    signal = "BUY" if score > 0.6 else "SELL" if score < 0.4 else "HOLD"

    out = {
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "symbol": asset["symbol"],
        "market": asset,
        "gasGwei": gas,
        "signal": {"score": round(score, 3), "signal": signal, "rsi": rsi_v},
        "monitor": {
            "health": "спокойный"
            if abs(asset["dayChangePct"] or 0) < 5 and abs(asset["fundingAnnualizedPct"]) < 40
            else "напряжённый",
            "openInterest": asset["openInterest"],
            "fundingAnnPct": round(asset["fundingAnnualizedPct"], 1),
            "dayVolumeUsd": asset["dayNotionalVolumeUsd"],
        },
        "academyPaper": paper,
        "recommendation": recommendation(asset),
        "sources": {
            "prices": "Hyperliquid metaAndAssetCtxs + candleSnapshot",
            "gas": "ethereum.publicnode.com eth_gasPrice",
        },
    }

    text = json.dumps(out, ensure_ascii=False, indent=2)
    if args.output == "-":
        sys.stdout.write(text + "\n")
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text + "\n")
        print(f"wrote {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
