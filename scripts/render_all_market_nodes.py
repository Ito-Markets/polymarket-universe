from __future__ import annotations

import colorsys
import hashlib
import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
OUTPUT = ROOT / "screenshots" / "all_market_nodes_constellation.png"

WIDTH = 2400
HEIGHT = 1500
BACKGROUND = (10, 16, 31, 255)
PANEL = (18, 27, 48, 235)

DOMAIN_COLORS = {
    "Sports": "#2B8C5A",
    "Crypto": "#D4A030",
    "US_Politics": "#9B3060",
    "Global_Politics": "#B06080",
    "Economics": "#2A7090",
    "Geopolitics": "#C04040",
    "Science_Technology": "#7040A0",
    "Entertainment": "#C09020",
    "Weather": "#4090B0",
    "Legal": "#C07040",
    "Health": "#309060",
    "Culture": "#A05888",
    "Environment": "#409050",
    "Esports": "#6050A0",
    "Other": "#808088",
}


def hex_to_rgba(value: str, alpha: int) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return (
        int(value[0:2], 16),
        int(value[2:4], 16),
        int(value[4:6], 16),
        alpha,
    )


def hash_unit(text: str, salt: str) -> float:
    digest = hashlib.blake2s(f"{salt}:{text}".encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, "big") / 2**64


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def load_domain_mapping() -> tuple[dict[str, str], Counter]:
    stats = json.loads((PUBLIC_DATA_DIR / "domain_stats.json").read_text())
    category_to_domain: dict[str, str] = {}
    domain_counts: Counter = Counter()
    for row in stats:
        category_to_domain[row["category"]] = row["domain"]
        domain_counts[row["domain"]] += row["count"]
    return category_to_domain, domain_counts


def contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


def infer_domain(row: dict[str, str], category_to_domain: dict[str, str]) -> str:
    category = row["cat"] if row["cat"] and row["cat"] != "None" else ""
    explicit = category_to_domain.get(category)
    if explicit:
        return explicit

    special_categories = {
        "NFTs": "Crypto",
        "US-current-affairs": "US_Politics",
        "Pop-Culture ": "Entertainment",
        "Business": "Economics",
        "Science": "Science_Technology",
        "Tech": "Science_Technology",
        "Global Politics": "Global_Politics",
        "Ukraine & Russia": "Geopolitics",
        "Coronavirus": "Health",
        "Coronavirus-": "Health",
        "Art": "Culture",
        "Chess": "Sports",
        "Olympics": "Sports",
        "Poker": "Sports",
    }
    if category in special_categories:
        return special_categories[category]

    title = row["t"].lower()
    slug = row["es"].lower()
    text = f"{title} {slug} {category.lower()}"

    if contains_any(
        text,
        (
            "bitcoin",
            "ethereum",
            "solana",
            "xrp",
            "dogecoin",
            "crypto",
            "btc",
            "eth",
            "fdv",
            "token",
            "memecoin",
            "ape",
            "airdrop",
            "nft",
            "coinbase",
        ),
    ):
        return "Crypto"

    if contains_any(text, ("counter-strike", "esports", "dota 2", "league of legends", "valorant", "cs2-", "dota2-")):
        return "Esports"

    if slug.startswith(
        (
            "nba-",
            "nfl-",
            "nhl-",
            "mlb-",
            "atp-",
            "wta-",
            "ufc-",
            "pga-",
            "cbb-",
            "cfb-",
            "epl-",
            "mls-",
            "mex-",
            "bra-",
            "arg-",
            "tur-",
            "esp-",
            "ita-",
            "ger-",
            "fl1-",
            "fl2-",
            "fl3-",
            "ned-",
            "bel-",
            "por-",
            "par-",
            "bol-",
            "col-",
            "ecu-",
            "per1-",
            "uru-",
            "sa1-",
            "sa2-",
            "aus-",
            "ten-",
        )
    ) or contains_any(
        text,
        (
            " vs. ",
            "match o/u",
            "map 1 winner",
            "first touchdown",
            "both teams to score",
            "exact score",
            "spread:",
            "moneyline",
            "warriors",
            "cavaliers",
            "pelicans",
            "march madness",
            "ncaa tournament",
            "olympique",
            "fc ",
        ),
    ):
        return "Sports"

    if contains_any(text, ("temperature", "rainfall", "snowfall", "hurricane", "weather", "degrees", "°f", "°c")):
        return "Weather"

    if contains_any(
        text,
        (
            "trump",
            "biden",
            "harris",
            "senate",
            "house",
            "governor",
            "president",
            "dnc",
            "rnc",
            "electoral",
            "election",
            "white house",
            "congress",
            "democrat",
            "republican",
            "walz",
            "vance",
        ),
    ):
        return "US_Politics"

    if contains_any(
        text,
        (
            "inflation",
            "interest rates",
            "ecb",
            "fed",
            "cpi",
            "payrolls",
            "unemployment",
            "recession",
            "treasury",
            "stock",
            "shares",
            "close at",
            "nasdaq",
            "s&p",
            "earnings",
            "tariff",
        ),
    ):
        return "Economics"

    if contains_any(
        text,
        (
            "ukraine",
            "russia",
            "putin",
            "israel",
            "gaza",
            "hamas",
            "iran",
            "china",
            "taiwan",
            "netanyahu",
            "war",
            "ceasefire",
            "sanction",
            "missile",
            "military",
        ),
    ):
        return "Geopolitics"

    if contains_any(
        text,
        (
            "oscar",
            "grammy",
            "emmy",
            "album",
            "song",
            "movie",
            "box office",
            "netflix",
            "drake",
            "taylor swift",
            "celebrity",
        ),
    ):
        return "Entertainment"

    if contains_any(text, ("covid", "coronavirus", "bird flu", "vaccine", "cdc", "who disease")):
        return "Health"

    if contains_any(text, ("lawsuit", "supreme court", "court", "indicted", "convicted", "trial", "legal")):
        return "Legal"

    if contains_any(text, ("openai", "chatgpt", "ai ", "artificial intelligence", "spacex", "tesla robotaxi", "nvidia")):
        return "Science_Technology"

    return "Other"


def load_market_records(category_to_domain: dict[str, str]):
    files = sorted(DATA_DIR.glob("all_markets_index.part*.json"))
    records: list[tuple[str, str, date]] = []
    domain_counts: Counter = Counter()
    category_counts: Counter = Counter()
    by_domain_categories: dict[str, Counter] = defaultdict(Counter)
    by_domain_category_rows: dict[tuple[str, str], list[tuple[str, date]]] = defaultdict(list)
    min_date: date | None = None
    max_date: date | None = None

    for file in files:
        rows = json.loads(file.read_text())
        for row in rows:
            created = date.fromisoformat(row["c"])
            category = row["cat"] if row["cat"] and row["cat"] != "None" else "Uncategorized"
            domain = infer_domain(row, category_to_domain)
            records.append((row["id"], category, created))
            domain_counts[domain] += 1
            category_counts[(domain, category)] += 1
            by_domain_categories[domain][category] += 1
            by_domain_category_rows[(domain, category)].append((row["id"], created))
            if min_date is None or created < min_date:
                min_date = created
            if max_date is None or created > max_date:
                max_date = created

    assert min_date is not None and max_date is not None
    return (
        records,
        domain_counts,
        category_counts,
        by_domain_categories,
        by_domain_category_rows,
        min_date,
        max_date,
    )


def domain_centers(domains: list[str]) -> dict[str, tuple[float, float]]:
    center_x = WIDTH * 0.53
    center_y = HEIGHT * 0.54
    radius_x = WIDTH * 0.25
    radius_y = HEIGHT * 0.22

    centers: dict[str, tuple[float, float]] = {}
    for index, domain in enumerate(domains):
        angle = (-np.pi / 2) + (index / max(len(domains), 1)) * np.pi * 2
        centers[domain] = (
            center_x + np.cos(angle) * radius_x,
            center_y + np.sin(angle) * radius_y,
        )
    return centers


def category_anchor(domain: str, category: str, domain_rank: int) -> tuple[float, float]:
    angle = hash_unit(category, "angle") * np.pi * 2
    radius = 45 + hash_unit(category, "radius") * (70 + domain_rank * 3)
    return np.cos(angle) * radius, np.sin(angle) * radius


def render():
    category_to_domain, _ = load_domain_mapping()
    (
        records,
        domain_counts,
        category_counts,
        by_domain_categories,
        by_domain_category_rows,
        min_date,
        max_date,
    ) = load_market_records(category_to_domain)
    domain_order = [name for name, _ in domain_counts.most_common()]
    centers = domain_centers(domain_order)
    total_days = max((max_date - min_date).days, 1)

    image = Image.new("RGBA", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)

    for cx, cy, rx, ry, alpha in [
        (WIDTH * 0.26, HEIGHT * 0.18, 420, 260, 34),
        (WIDTH * 0.72, HEIGHT * 0.22, 540, 300, 28),
        (WIDTH * 0.66, HEIGHT * 0.78, 500, 300, 24),
    ]:
        blob = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        blob_draw = ImageDraw.Draw(blob)
        blob_draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(60, 96, 180, alpha))
        image.alpha_composite(blob.filter(ImageFilter.GaussianBlur(90)))

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    crisp = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    crisp_draw = ImageDraw.Draw(crisp)

    for domain_index, domain in enumerate(domain_order):
        center_x, center_y = centers[domain]
        categories = [name for name, _ in by_domain_categories[domain].most_common()]
        color = DOMAIN_COLORS.get(domain, DOMAIN_COLORS["Other"])
        glow_color = hex_to_rgba(color, 26)
        point_color = hex_to_rgba(color, 214 if domain in {"Crypto", "Sports", "Other"} else 188)

        for category in categories:
            anchor_x, anchor_y = category_anchor(domain, category, domain_index)
            count = category_counts[(domain, category)]
            time_span = 90 + np.log1p(count) * 22
            band_angle = hash_unit(category, "band") * np.pi * 2
            tangent_x = np.cos(band_angle)
            tangent_y = np.sin(band_angle) * 0.62
            normal_x = -tangent_y
            normal_y = tangent_x

            for market_id, created in by_domain_category_rows[(domain, category)]:
                t = ((created - min_date).days / total_days) - 0.5
                jitter_a = hash_unit(market_id, "jitter-a") * np.pi * 2
                jitter_r = 1.5 + hash_unit(market_id, "jitter-r") * 10
                x = center_x + anchor_x + tangent_x * time_span * t + normal_x * ((hash_unit(market_id, "band-wobble") - 0.5) * 34)
                y = center_y + anchor_y + tangent_y * time_span * t + normal_y * ((hash_unit(market_id, "band-wobble-2") - 0.5) * 34)
                x += np.cos(jitter_a) * jitter_r
                y += np.sin(jitter_a) * jitter_r

                x = clamp(x, 170, WIDTH - 320)
                y = clamp(y, 160, HEIGHT - 170)

                glow_draw.point((x, y), fill=glow_color)
                crisp_draw.point((x, y), fill=point_color)

    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(1.2)))
    image.alpha_composite(crisp)

    panel = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((84, 70, 910, 326), radius=32, fill=PANEL, outline=(54, 73, 110, 160), width=1)
    image.alpha_composite(panel)

    title_font = load_font(54)
    body_font = load_font(20)
    metric_font = load_font(34)
    label_font = load_font(16)

    draw = ImageDraw.Draw(image)
    draw.text((122, 112), "Every prediction market as a node", font=title_font, fill=(236, 239, 247, 255))
    draw.text(
        (124, 180),
        "All 546,234 Polymarket contracts rendered as a single market-level constellation.\n"
        "Color = domain. Position = domain cluster + category anchor + creation-time drift.",
        font=body_font,
        fill=(162, 172, 195, 255),
        spacing=8,
    )

    metrics = [
        ("Markets", f"{len(records):,}"),
        ("Domains", f"{len(domain_order)}"),
        ("Span", f"{min_date.isoformat()} to {max_date.isoformat()}"),
    ]
    metric_x = 124
    for label, value in metrics:
        draw.text((metric_x, 258), value, font=metric_font, fill=(241, 244, 250, 255))
        draw.text((metric_x, 300), label.upper(), font=label_font, fill=(129, 141, 168, 255))
        metric_x += 240 if label != "Span" else 0

    legend_y = HEIGHT - 106
    legend_x = 112
    for domain, count in domain_counts.most_common(8):
        color = DOMAIN_COLORS.get(domain, DOMAIN_COLORS["Other"])
        draw.rounded_rectangle((legend_x, legend_y, legend_x + 16, legend_y + 16), radius=8, fill=hex_to_rgba(color, 230))
        draw.text((legend_x + 24, legend_y - 1), domain.replace("_", " "), font=body_font, fill=(214, 221, 234, 255))
        draw.text((legend_x + 24, legend_y + 22), f"{count:,} markets", font=label_font, fill=(124, 138, 168, 255))
        legend_x += 250

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(OUTPUT, quality=95)
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    render()
