#!/usr/bin/env python3
"""Cut the one-off art and the drawing ingredients out of the Tabletop Simulator mod's files
(`raw scans/tts/`, see manifest.json there) into src/assets/, and write src/generated.ts.

Everything that is a layout plus data (cards, sparks, indicators, price markers, min-spec
tiles, axis strips, dealership faces) is DRAWN on the client from consts.ts; this script only
ships what cannot be drawn — the flat board scan, cut into its sections and spaces — and the
small ingredients the drawn faces are assembled from (paper, a car icon, the clock icon, the
chevron outline, the dealership's dotted paper). Rectangles live in tables here, so a bad crop
is a table edit, not a lost PNG. Run scripts/extract-art.py first (the scans' tracks, stations,
pieces); this script reads one of its outputs.

  python3 scripts/extract-tts.py            # writes the asset folders and src/generated.ts
  python3 scripts/extract-tts.py --sheet    # also writes a contact sheet to $TMPDIR

Needs: pip3 install opencv-python-headless numpy
"""
import json, os, sys, tempfile
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS = os.path.join(ROOT, "raw scans", "tts")
SCANS = os.path.join(ROOT, "raw scans")
OUT = os.path.join(ROOT, "src", "assets")
SHEETS = []


def load(name, flags=cv2.IMREAD_COLOR):
    img = cv2.imread(os.path.join(TTS, name), flags)
    if img is None:
        raise SystemExit(f"missing mod file: {name}")
    return img


def folder(name, sprite):
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith((".png", ".jpg")):
            os.remove(os.path.join(d, f))
    with open(os.path.join(d, "sprite.json"), "w") as fh:
        json.dump(sprite, fh, indent=1)
    return d


def save(d, name, img, sheet=True):
    ext = ".png" if img.ndim == 3 and img.shape[2] == 4 else ".jpg"
    cv2.imwrite(os.path.join(d, name + ext), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if sheet:
        SHEETS.append((os.path.basename(d) + "/" + name, img))


def crop(img, x0, y0, x1, y1):
    h, w = img.shape[:2]
    x0, x1 = max(0, int(round(x0))), min(w, int(round(x1)))
    y0, y1 = max(0, int(round(y0))), min(h, int(round(y1)))
    return img[y0:y1, x0:x1].copy()


def runs(frac, thr):
    """Start/end indices of every run where `frac` exceeds `thr`."""
    idx = np.where(frac > thr)[0]
    out = []
    if len(idx) == 0:
        return out
    s = p = idx[0]
    for i in idx[1:]:
        if i != p + 1:
            out.append((int(s), int(p)))
            s = i
        p = i
    out.append((int(s), int(p)))
    return out


def line_centres(dark, box, axis, thr):
    """Centres of the printed lines crossing `box` (x0, y0, x1, y1): long runs of dark pixels
    along `axis` (0 = vertical lines, 1 = horizontal lines)."""
    x0, y0, x1, y1 = box
    sub = dark[y0:y1, x0:x1]
    off = x0 if axis == 0 else y0
    return [off + (a + b) / 2 for a, b in runs(sub.mean(axis), thr)]


# ------------------------------------------------------------------------------------------
# The board: the mod's flat scan (4866x2388). Its printed lines are measured here, not typed,
# and asserted against the component counts (10 Gantt columns, 5 focus slots, 10 punch-clock
# columns, 5 capacity boxes, 5 minimum-spec boxes, an 8x8 market frame).
# ------------------------------------------------------------------------------------------
BOARD_FILE = "056_unnamed.jpg"

# The market half is resampled so that the inside of its thick frame lands exactly where the
# photo's did (MARKET_FRAME in a 2650-square), so the chits' MARKET_EDGE and niche grid are
# unchanged: the 8x8 frame is 2362 px across, centred, in a 2650 px crop.
MARKET = dict(x0=0, y0=0, x1=2650, y1=2650)
MARKET_FRAME = dict(x0=144, y0=144, x1=2506, y1=2506)
# What ships: the frame, its thick outer line and 18 px of paper beyond it. The printed outer
# margin, with its own axis pips, is cut away: the axis strips beside the board show the axes.
MARKET_CROP = dict(x0=114, y0=114, x1=2536, y1=2536)
# The board's right half (scan pixels): planning office, wealth accumulation, minimum
# specifications, punch clock and assembly capacity are one printed board, shown whole.
# The planning office (title art, Gantt, focus, last year's focus) and the punch clock, each
# its own panel. The rest of the right half (wealth, minimum specifications, capacity) is not
# shown: money and capacity are sparks, minimum specs are tiles beside the market.
OFFICE = dict(x0=2372, y0=12, x1=3540, y1=1134)
CLOCK = dict(x0=2380, y0=1762, x1=3548, y1=2246)
PAPER = (3000, 8, 3084, 92)  # plain paper in the margin above the planning office (no faint art)
GEO = {}


def measure(b):
    g = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
    dark = g < 120
    # Market frame: the thick outer lines (the two thick lines at either edge of the grid).
    v = [c for c in line_centres(dark, (100, 150, 2400, 2230), 0, 0.7)]
    h = [c for c in line_centres(dark, (100, 100, 2300, 2300), 1, 0.7)]
    fx0, fx1 = v[0], v[-1]
    fy0, fy1 = h[0], h[-1]
    thick = 12  # the frame line's own width; the grid starts inside it
    frame = (fx0 + thick / 2, fy0 + thick / 2, fx1 - thick / 2, fy1 - thick / 2)
    gx = line_centres(dark, (2380, 450, 3540, 665), 0, 0.6)
    gx = [x for x in gx if not 3235 < x < 3248]  # the clock symbol's stem in space 10
    assert len(gx) == 11, gx
    gy = line_centres(dark, (2395, 300, 3520, 700), 1, 0.5)
    assert len(gy) == 4, gy
    fxs = line_centres(dark, (2380, 765, 3540, 935), 0, 0.5)
    fxs = [x for x in fxs if 2450 < x < 3450 and not 3235 < x < 3248]
    assert len(fxs) == 6, fxs
    fys = line_centres(dark, (2420, 700, 3500, 1150), 1, 0.5)
    assert len(fys) == 3, fys
    mx = line_centres(dark, (2380, 1380, 3540, 1720), 0, 0.5)
    assert len(mx) == 6, mx
    # The boxes' top and bottom rules; the dimension names inside the boxes are skipped.
    my = [c for c in line_centres(dark, (2420, 1380, 3500, 1760), 1, 0.25) if c > 1430]
    my = [my[0], my[-1]]
    assert 250 < my[1] - my[0] < 320, my
    cx = line_centres(dark, (2380, 1750, 3540, 2250), 0, 0.5)
    assert len(cx) == 11, cx
    cy = line_centres(dark, (2400, 1740, 3520, 2260), 1, 0.5)  # the five rules of the punch clock, clean once the scan is level
    assert len(cy) == 5, cy
    ax = line_centres(dark, (3560, 1450, 4800, 1700), 0, 0.5)
    assert len(ax) == 6, ax
    ay = [c for c in line_centres(dark, (3620, 1380, 4720, 1760), 1, 0.25) if c > 1430]
    ay = [ay[0], ay[-1]]
    assert 250 < ay[1] - ay[0] < 320, ay
    # Wealth Accumulation: 11 column lines and 7 row lines (the top edge, the lap row's bottom,
    # then the five rows of 1..50); the lap row is split into 0, +50, +100, +150 by 5 lines.
    wx = line_centres(dark, (3560, 560, 4820, 1100), 0, 0.5)
    assert len(wx) == 11, wx
    wy = [y for y in line_centres(dark, (3600, 280, 4780, 1140), 1, 0.5) if not 320 < y < 345]  # the title rule, once the scan is level
    assert len(wy) == 7, wy
    lx = line_centres(dark, (3560, 330, 4820, 530), 0, 0.5)
    assert len(lx) == 5, lx
    r = lambda xs: [round(float(x), 1) for x in xs]
    GEO["MARKET_FRAME_SCAN"] = r(frame)  # inside of the 8x8 frame on the scan: x0, y0, x1, y1
    GEO.update({
        "GANTT_X": r(gx), "GANTT_Y": r(gy), "FOCUS_X": r(fxs), "FOCUS_Y": r(fys),
        "MINSPEC_X": r(mx), "MINSPEC_Y": r(my), "CLOCK_X": r(cx), "CLOCK_Y": r(cy),
        "CAPACITY_X": r(ax), "CAPACITY_Y": r(ay),
        "WEALTH_X": r(wx), "WEALTH_Y": r(wy), "WEALTH_LAP_X": r(lx),
    })
    return frame


MINSPEC_ORDER = ["speed", "design", "reliability", "safety", "range"]  # as printed, left to right


def market_square(b, frame):
    """The market half, warped so the frame's inside is MARKET_FRAME of a 2650-square."""
    fx0, fy0, fx1, fy1 = frame
    src = np.float32([[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]])
    f = MARKET_FRAME
    dst = np.float32([[f["x0"], f["y0"]], [f["x1"], f["y0"]], [f["x1"], f["y1"]], [f["x0"], f["y1"]]])
    m = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(b, m, (MARKET["x1"], MARKET["y1"]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def level(b):
    """The scan sits about half a degree off level (developer: "why is the whole thing rotated
    slightly?"). Measure the planning office's long printed horizontals at their left and right
    ends, and rotate the whole scan so they run level, before anything is measured or cut."""
    g = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
    reg = (g[OFFICE["y0"]:OFFICE["y1"], OFFICE["x0"]:OFFICE["x1"]] < 110).astype(np.float32)
    h, w = reg.shape
    def lines(x0, x1):
        prof = reg[:, x0:x1].mean(axis=1)
        ys, run = [], []
        for y in range(h):
            if prof[y] > 0.6:
                run.append(y)
            elif run:
                ys.append(sum(run) / len(run)); run = []
        return ys
    xl, xr = 0.125 * w, 0.875 * w
    left, right = lines(int(0.05 * w), int(0.2 * w)), lines(int(0.8 * w), int(0.95 * w))
    pairs = [(l, r) for l in left for r in right if abs(l - r) < 20]
    assert len(pairs) >= 4, pairs
    angle = float(np.degrees(np.arctan2(np.median([r - l for l, r in pairs]), xr - xl)))
    assert abs(angle) < 2, angle
    m = cv2.getRotationMatrix2D((b.shape[1] / 2, b.shape[0] / 2), angle, 1.0)
    print(f"levelled the board scan by {angle:.2f} degrees")
    return cv2.warpAffine(b, m, (b.shape[1], b.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def board():
    b = level(load(BOARD_FILE))
    frame = measure(b)
    mk = market_square(b, frame)
    d = folder("board", {"default": {"maxWidth": 1600, "maxHeight": 1600, "format": "jpg"}})
    save(d, "market", crop(mk, MARKET_CROP["x0"], MARKET_CROP["y0"], MARKET_CROP["x1"], MARKET_CROP["y1"]))
    save(d, "office", crop(b, OFFICE["x0"], OFFICE["y0"], OFFICE["x1"], OFFICE["y1"]))
    save(d, "clock", crop(b, CLOCK["x0"], CLOCK["y0"], CLOCK["x1"], CLOCK["y1"]))
    # One crop per printed space, so each space chit carries its own art, exactly over the
    # section underneath, and highlights like the real square.
    cells = folder("boardCells", {"default": {"maxWidth": 200, "maxHeight": 200, "format": "jpg"}})
    f = MARKET_FRAME
    cw, ch = (f["x1"] - f["x0"]) / 8, (f["y1"] - f["y0"]) / 8
    for row in range(1, 9):
        for col in range(1, 9):
            x0, y0 = f["x0"] + (col - 1) * cw, f["y0"] + (row - 1) * ch
            save(cells, f"niche_{row}_{col}", crop(mk, x0, y0, x0 + cw, y0 + ch), sheet=(row == 1))
    # Card grid cells: the market growth cards print quadrant I's hatching (read off the mod's
    # card sheets: cells with anti-diagonal distance ≤ 3 are the dark hatch, the rest light),
    # so each card cell is the inside of the matching quadrant-I niche, clear of the board's
    # lines. Niche (5,1) carries its "I" label, so that cell borrows its neighbour below.
    inset = 0.14 * cw
    for row in range(1, 5):
        for col in range(1, 5):
            r, c = (4 + row, col) if (row, col) != (1, 1) else (6, 1)
            x0, y0 = f["x0"] + (c - 1) * cw, f["y0"] + (r - 1) * ch
            save(cells, f"cardcell_{row}_{col}", crop(mk, x0 + inset, y0 + inset, x0 + cw - inset, y0 + ch - inset), sheet=False)
    GX, GY, FX, FY = GEO["GANTT_X"], GEO["GANTT_Y"], GEO["FOCUS_X"], GEO["FOCUS_Y"]
    save(cells, "gantt_0", crop(b, GX[0], GY[0], GX[-1], GY[1]))
    for i in range(1, 21):
        k, row = (i - 1) % 10, 1 + (i - 1) // 10
        save(cells, f"gantt_{i}", crop(b, GX[k], GY[row], GX[k + 1], GY[row + 1]), sheet=i in (1, 10, 20))
    MX, MY, AX, AY, CX, CY = GEO["MINSPEC_X"], GEO["MINSPEC_Y"], GEO["CAPACITY_X"], GEO["CAPACITY_Y"], GEO["CLOCK_X"], GEO["CLOCK_Y"]
    for i in range(1, 6):
        save(cells, f"focus_{i}", crop(b, FX[i - 1], FY[0], FX[i], FY[1]), sheet=i == 1)
        save(cells, f"historical_{i}", crop(b, FX[i - 1], FY[1], FX[i], FY[2]), sheet=i == 1)
        save(cells, f"capacity_{i}", crop(b, AX[i - 1], AY[0], AX[i], AY[1]), sheet=i in (1, 5))
    for p in range(40, 0, -1):
        k = 40 - p
        c, row = k % 10, k // 10
        save(cells, f"clock_{p}", crop(b, CX[c], CY[row], CX[c + 1], CY[row + 1]), sheet=p in (40, 1))
    # Panel-tab icons, from the board's own art.
    ic = folder("icons", {"default": {"maxWidth": 160, "maxHeight": 160, "format": "jpg"}})
    save(ic, "officeIcon", crop(b, 3290, 20, 3545, 300))  # the clerks at the right of the title
    GX2, GY2 = GEO["GANTT_X"], GEO["GANTT_Y"]
    save(ic, "clockIcon", crop(b, GX2[9] + 8, GY2[1] + 8, GX2[10] - 8, GY2[2] - 8))  # the printed punch-clock symbol
    save(ic, "marketIcon", crop(mk, f["x0"], f["y0"], f["x0"] + 2 * cw, f["y0"] + 2 * ch))
    return b


# ------------------------------------------------------------------------------------------
# Ingredients for the drawn faces.
# ------------------------------------------------------------------------------------------
def mirror_tile(patch):
    top = np.hstack([patch, cv2.flip(patch, 1)])
    return np.vstack([top, cv2.flip(top, 0)])


def white_icon(bgr, lo=150, hi=230, counter_mask=True):
    """A white line-art icon with its coloured ground knocked out: alpha from luminance,
    inside the counter only (the scan's white lid around the counter is masked away)."""
    if not counter_mask:
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        a = np.clip((g - lo) / (hi - lo), 0, 1)
        a[a < 0.12] = 0  # the counter's print speckle
        rgba = np.full(bgr.shape[:2] + (4,), 255, np.uint8)
        rgba[..., 3] = (a * 255).astype(np.uint8)
        n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.3).astype(np.uint8))
        keep = max(range(1, n), key=lambda i: stats[i, cv2.CC_STAT_AREA])
        x, y, w, h = stats[keep, :4]
        return rgba[max(0, y - 4):y + h + 4, max(0, x - 4):x + w + 4]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 1] > 45) | (hsv[..., 2] < 120)).astype(np.uint8) * 255  # the dark purple counter has little saturation
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    # The counters lie a little turned on the scanner; straighten the crop first so the
    # icon prints level, as it does on the counter.
    (cx, cy), _, ang = cv2.minAreaRect(c)
    ang = ((ang + 45) % 90) - 45
    rot = cv2.getRotationMatrix2D((cx, cy), ang, 1.0)
    bgr = cv2.warpAffine(bgr, rot, (bgr.shape[1], bgr.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    c = cv2.transform(c.reshape(-1, 1, 2).astype(np.float32), rot).astype(np.int32)
    counter = np.zeros_like(m)
    cv2.drawContours(counter, [c], -1, 255, -1)
    counter = cv2.erode(counter, np.ones((15, 15), np.uint8)) > 0
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    a = np.clip((g - lo) / (hi - lo), 0, 1) * counter
    rgba = np.full(bgr.shape[:2] + (4,), 255, np.uint8)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    ys, xs = np.where(a > 0.5)
    return rgba[ys.min() - 2:ys.max() + 3, xs.min() - 2:xs.max() + 3]


def ingredients(b):
    d = folder("ingredients", {"default": {"maxWidth": 512, "maxHeight": 512, "format": "png", "palette": True}, "overrides": {"paper|cardBack": {"format": "jpg"}}})
    # Plain board paper, mirrored into a seamless tile: the ground of cards, markers and strips.
    save(d, "paper", mirror_tile(crop(b, *PAPER)))
    # The punch-clock symbol (mod file 135: the symbol on transparent ground), doubled in size
    # so the cards' clock boxes stay crisp.
    clock = load("135_unnamed.png", cv2.IMREAD_UNCHANGED)
    save(d, "clockIcon", cv2.resize(clock, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
    # The white car printed on the spark counters and the cards' spark cells: from the mod's
    # single-car counters (upright, 100 px), upscaled before the alpha is taken so the line
    # art stays crisp. One per car type, alpha only; the face supplies the type colour.
    for car, f in SPARK_FILES.items():
        big = cv2.resize(load(f, cv2.IMREAD_UNCHANGED)[..., :3], None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        icon = white_icon(big, 150, 225, counter_mask=False)
        save(d, f"carIcon_{car}", icon)
        save(d, f"carToken_{car}", car_token(icon, print_colour(f)))
    # The cards' own paper: plain cream from the blank band under a card's grid, mirrored.
    card = load("124_design.png")[0:386, 0:255]
    save(d, "cardPaper", mirror_tile(cv2.resize(crop(card, 40, 246, 120, 300), None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)))
    # Card backs: the real backs — the title over a photograph of an early motor car, tinted
    # per deck colour (mod files 125/127/129/131/133, told apart by hue), and the neutral
    # deck's black back.
    for colour, f in CARD_BACKS.items():
        save(d, f"cardBack_{colour}", load(f)[..., :3])
    save(d, "cardBack_neutral", load("113_unnamed.png")[..., :3])
    # The factory floor as printed (mod file 071, the main floor at 80 px a square): one plain
    # square of the black floor with its corner crosses, and one square of the loading bay's
    # diagonal hatching cut to a whole number of stripe periods so it tiles without a seam.
    floor = load("071_unnamed.jpg")
    d0 = FLOOR_DOT
    save(d, "floorSquare", crop(floor, d0, d0, d0 + FLOOR_SQ, d0 + FLOOR_SQ))
    hatch = crop(floor, 60, 60, 60 + 2 * HATCH_PERIOD, 60 + 2 * HATCH_PERIOD)
    save(d, "baySquare", cv2.resize(hatch, (FLOOR_SQ, FLOOR_SQ), interpolation=cv2.INTER_AREA))
    # The timecard's two faces (the punch clock, and FINISH once it has turned over) and the
    # obsolescence marker's arrow: the mod's icons on transparent ground.
    save(d, "finishIcon", load("136_unnamed.png", cv2.IMREAD_UNCHANGED))
    save(d, "arrowIcon", cv2.resize(load("114_unnamed.png", cv2.IMREAD_UNCHANGED), (256, 256), interpolation=cv2.INTER_AREA))
    felt()


# Card backs by deck colour: the mod's five backs, identified by the photograph's tint.
CARD_BACKS = {"green": "125_unnamed.png", "red": "127_unnamed.png", "purple": "129_unnamed.png", "yellow": "131_unnamed.png", "blue": "133_unnamed.png"}
# The floor scan's grid: crosses every 80 px, the first whole square's corner cross at 561;
# the bay's stripes repeat every 41 px across.
FLOOR_SQ, FLOOR_DOT, HATCH_PERIOD = 80, 561, 41


def felt():
    """The table: the worn wooden floorboards of an old works, generated so it tiles without a
    seam at 2048 px. Greyscale on purpose: each panel tints it (src/table.ts), warm brown on the
    shared panels and the player's colour, muted, on their own. Eight boards across the tile, each
    with its own grain (stretched noise), tone and staggered end joints, dark seams with a slight
    bevel, a few knots, and low wear. (Concrete before this read as "the moon's surface".)"""
    n = 2048
    rng = np.random.default_rng(23)
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing="ij")

    def grain_field(stretch):
        # Long fibres along x: power only at low x-frequencies, broad in y.
        f = np.fft.fft2(rng.standard_normal((n, n)))
        w = np.exp(-((fx * stretch) ** 2)) * (np.abs(fy) < 0.12) * (np.abs(fy) > 0.002)
        out = np.real(np.fft.ifft2(f * w))
        out -= out.mean()
        return out / out.std()

    fine = grain_field(900)
    coarse = grain_field(250)
    f = np.fft.fft2(rng.standard_normal((n, n)))
    r = np.sqrt(fx * fx + fy * fy) + 1e-6
    wear = np.real(np.fft.ifft2(f * (r ** -2.0) * (r > 1e-4) * (r < 0.01)))
    wear = (wear - wear.mean()) / wear.std()

    boards = 8
    bh = n // boards
    img = np.zeros((n, n), np.float32)
    for b in range(boards):
        y0 = b * bh
        shift = int(rng.integers(0, n))  # each board its own stretch of grain
        g = np.roll(0.6 * fine + 0.4 * coarse, (int(rng.integers(0, n)), shift), axis=(0, 1))[y0:y0 + bh]
        tone = rng.uniform(0.82, 1.08)
        img[y0:y0 + bh] = tone * (1.0 + 0.10 * g)
        # End joints: one or two per board, staggered, each a dark line with a tone change after it.
        joints = sorted(int(x) for x in rng.integers(0, n, int(rng.integers(1, 3))))
        for x in joints:
            img[y0:y0 + bh, x:x + 3] *= 0.55
            img[y0:y0 + bh, (x + 3) % n:] *= rng.uniform(0.95, 1.05)
        # Knots: a dark eye with a few rings around it.
        for _ in range(int(rng.integers(0, 3))):
            cx, cy = int(rng.integers(0, n)), y0 + int(rng.integers(bh // 4, 3 * bh // 4))
            for k, (rad, v) in enumerate([(26, 0.93), (16, 0.86), (8, 0.72)]):
                m = np.zeros((n, n), np.float32)
                for dx in (0, -n, n):
                    cv2.ellipse(m, (cx + dx, cy), (int(rad * 2.2), rad), 0, 0, 360, 1.0, -1)
                m = cv2.GaussianBlur(m, (0, 0), 3)
                img = img * (1 - m * (1 - v))
    # Seams between boards, with a bevel: dark line, light lip below it.
    for b in range(boards):
        y = b * bh
        img[y:y + 3] *= 0.45
        img[(y + 3) % n:(y + 6) % n or n] *= 1.06
    img *= 1.0 + 0.06 * wear
    img = cv2.GaussianBlur(img, (0, 0), 0.6)
    out = np.clip(150 * img, 0, 255).astype(np.uint8)
    out = cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)
    d = folder("environment", {"default": {"maxWidth": 2048, "format": "jpg"}})
    cv2.imwrite(os.path.join(d, "felt.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 82])
    SHEETS.append(("environment/felt", out))


def chevron_path():
    """The spec indicator's chevron, traced from the mod's indicator image: the outline of
    the fill plus its heavy black edge, as an SVG path in a 100-unit box (y down)."""
    im = load("170_Design_A.png")
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 2] < 90) | (hsv[..., 1] > 90)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(float)
    x0, y0 = c.min(0)
    w, h = c.max(0) - c.min(0)
    s = 100 / max(w, h)
    pts = cv2.approxPolyDP(((c - [x0, y0]) * s).astype(np.float32).reshape(-1, 1, 2), 1.0, True).reshape(-1, 2)
    path = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
    # The printed edge is about 7% of the chevron's width.
    return {"path": path, "w": round(w * s, 1), "h": round(h * s, 1), "edge": 7}


def trace_alpha(name, box=100.0, eps=0.8):
    """An alpha-cut silhouette as an SVG path in a `box`-unit box (y down), plus its colour."""
    im = load(name, cv2.IMREAD_UNCHANGED)
    a = (im[..., 3] > 128).astype(np.uint8) * 255
    cs, _ = cv2.findContours(a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(float)
    x0, y0 = c.min(0)
    w, h = c.max(0) - c.min(0)
    s = box / max(w, h)
    pts = cv2.approxPolyDP(((c - [x0, y0]) * s).astype(np.float32).reshape(-1, 1, 2), eps, True).reshape(-1, 2)
    path = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
    px = im[..., :3][im[..., 3] > 200]
    b, g, r = np.median(px, axis=0)
    return {"path": path, "w": round(w * s, 1), "h": round(h * s, 1), "hex": f"#{int(r):02x}{int(g):02x}{int(b):02x}"}


CARS = {"car": "070_Car.png", "sports": "076_Sports_Car.png", "truck": "077_Truck.png"}
# The mod's single-car spark counters (002/004/006 are their doubles).
SPARK_FILES = {"car": "057_unnamed.png", "sports": "059_unnamed.png", "truck": "061_unnamed.png"}


def car_token(icon, hex_):
    """A car type's symbol for the log and prompts, as its spark counter prints it: the white car
    on the type's ink, in a rounded chip (white on the engine's pale token chip did not read)."""
    h, w = icon.shape[:2]
    pad = int(h * 0.22)
    H, W = h + 2 * pad, w + 2 * pad
    ink = tuple(int(hex_[i:i + 2], 16) for i in (5, 3, 1))  # BGR
    out = np.zeros((H, W, 4), np.uint8)
    chip = np.zeros((H, W), np.uint8)
    r = int(H * 0.22)
    cv2.rectangle(chip, (r, 0), (W - 1 - r, H - 1), 255, -1)
    cv2.rectangle(chip, (0, r), (W - 1, H - 1 - r), 255, -1)
    for cx, cy in ((r, r), (W - 1 - r, r), (r, H - 1 - r), (W - 1 - r, H - 1 - r)):
        cv2.circle(chip, (cx, cy), r, 255, -1, cv2.LINE_AA)
    out[..., :3] = ink
    a = icon[..., 3:4].astype(np.float32) / 255
    region = out[pad:pad + h, pad:pad + w, :3].astype(np.float32)
    out[pad:pad + h, pad:pad + w, :3] = (region * (1 - a) + 255 * a).astype(np.uint8)
    out[..., 3] = chip
    return out


def print_colour(name):
    """The ink colour of a spark print: the median of the counter's non-white pixels."""
    im = load(name)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    b, gg, r = np.median(im[g < 150], axis=0)
    return f"#{int(r):02x}{int(gg):02x}{int(b):02x}"
BRANDS = {"red": "065_unnamed.png", "blue": "066_unnamed.png", "green": "067_unnamed.png", "purple": "068_unnamed.png", "yellow": "069_unnamed.png"}


def write_ts(chevron):
    lines = [
        "// GENERATED by scripts/extract-tts.py from the mod's flat board scan. Do not edit by hand.",
        "// Printed-line positions in pixels of the scan (sections) or of the resampled market square.",
        "",
        f"export const MARKET_PX = {json.dumps(MARKET)};",
        f"export const MARKET_FRAME_PX = {json.dumps(MARKET_FRAME)};",
        f"export const MARKET_CROP_PX = {json.dumps(MARKET_CROP)};",
        f"export const OFFICE_PX = {json.dumps(OFFICE)};",
        f"export const CLOCK_PX = {json.dumps(CLOCK)};",
    ]
    for k, v in GEO.items():
        lines.append(f"export const {k} = {json.dumps(v)};")
    lines += ["", "// The spec indicator's chevron outline (y down), traced from the real counter.", f"export const CHEVRON = {json.dumps(chevron)} as const;"]
    cars = {k: trace_alpha(v) for k, v in CARS.items()}
    brands = {k: trace_alpha(v) for k, v in BRANDS.items()}
    lines += ["", "// The wooden pieces: side silhouettes of the car meeples and the brand pieces, traced from", "// the mod's cut-outs, with their wood colour sampled from them.",
              f"export const CARS = {json.dumps(cars, indent=1)} as const;", f"export const BRAND_COLORS = {json.dumps({k: v['hex'] for k, v in brands.items()})} as const;",
              "", "// The ink of each car type's print on the spark counters and the cards' spark cells.",
              f"export const SPARK_COLORS = {json.dumps({k: print_colour(v) for k, v in SPARK_FILES.items()})} as const;"]
    with open(os.path.join(ROOT, "src", "generated.ts"), "w") as fh:
        fh.write("\n".join(lines) + "\n")


def sheet():
    tiles = []
    for name, im in SHEETS:
        if im.ndim == 3 and im.shape[2] == 4:
            bg = np.full(im.shape[:2] + (3,), 160, np.uint8)
            a = im[..., 3:4] / 255.0
            im = (im[..., :3] * a + bg * (1 - a)).astype(np.uint8)
        if im.ndim == 2:
            im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
        s = 180 / max(im.shape[:2])
        t = cv2.resize(im, (max(1, int(im.shape[1] * s)), max(1, int(im.shape[0] * s))))
        tiles.append((name, t))
    cols = 8
    rows = (len(tiles) + cols - 1) // cols
    out = np.full((rows * 210, cols * 190, 3), 235, np.uint8)
    for i, (name, t) in enumerate(tiles):
        r, c = divmod(i, cols)
        out[r * 210: r * 210 + t.shape[0], c * 190: c * 190 + t.shape[1]] = t
        cv2.putText(out, name[-24:], (c * 190, r * 210 + 200), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)
    p = os.path.join(os.environ.get("SHEET_DIR", tempfile.gettempdir()), "tts-sheet.jpg")
    cv2.imwrite(p, out)
    print("contact sheet:", p)


if __name__ == "__main__":
    b = board()
    ingredients(b)
    write_ts(chevron_path())
    if "--sheet" in sys.argv:
        sheet()
