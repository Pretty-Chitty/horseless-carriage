#!/usr/bin/env python3
"""Cut every piece of component art out of the developer's raw scans into src/assets/.
The board itself comes from the mod's flat scan: scripts/extract-tts.py, run after this.

The game must look like the physical game, so every face is either a crop of the real
component or composed from crops of it (backgrounds, patterns, icons). Nothing is redrawn.
Rectangles live in tables here, so a bad crop is a table edit, not a lost PNG.

  python3 scripts/extract-art.py            # writes the asset folders and src/outlines.ts
  python3 scripts/extract-art.py --sheet    # also writes contact sheets to $TMPDIR

Needs: pip3 install opencv-python-headless numpy pillow
"""
import json, os, sys, tempfile
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCANS = os.path.join(ROOT, "raw scans")
OUT = os.path.join(ROOT, "src", "assets")
SHEETS = []


def scan(name, rotate180=False):
    img = cv2.imread(os.path.join(SCANS, name))
    if img is None:
        raise SystemExit(f"missing scan: {name}")
    return cv2.rotate(img, cv2.ROTATE_180) if rotate180 else img


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


# ------------------------------------------------------------------------------------------
# Research tracks: one die-cut shape for all five; the scan is upside down.
# ------------------------------------------------------------------------------------------
TRACK_ORDER = ["range", "reliability", "design", "speed", "safety"]  # top to bottom, rotated
TRACK_TOP = {d: 8 + 618 * i for i, d in enumerate(TRACK_ORDER)}  # rough band per strip
# The printed layout of every track, measured from its body's top-left corner (all five are
# printed identically): slot centres along x, the slots' band in y, and the body's height.
SLOT_DX0, SLOT_PITCH = 185, 332    # start-space centre, then one slot every 332 px
SLOT_W, START_W = 286, 300
SLOT_Y0, SLOT_Y1 = 28, 468
TRACKS = {}  # dimension -> {"path", "w", "h", "bodyLeft", "bodyTop", "bodyH"} in crop pixels


def is_background(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return (hsv[..., 1] < 30) & (hsv[..., 2] > 165)


def tracks():
    """Each track is cut on its own: the five lie a little shifted and skewed on the scan, and
    their die-cut outline (a body that flares at its lower corners, a name tab below) is not a
    rectangle. Per strip: measure its top edge, turn it level, trace its outline, crop it."""
    img = scan("horseless tracks.jpeg", rotate180=True)
    H, W = img.shape[:2]
    bg = is_background(img)
    d = folder("tracks", {"default": {"maxWidth": 1400, "format": "jpg"}})
    slots = folder("trackSlots", {"default": {"maxWidth": 180, "maxHeight": 300, "format": "jpg"}})

    def top_edge(x, approx):
        for y in range(max(1, approx - 60), min(H - 1, approx + 120)):
            if not bg[y - 1:y + 2, x].any():
                return y
        return None

    tops = {}
    for dim in TRACK_ORDER:
        approx = TRACK_TOP[dim]
        pts = [(x, top_edge(x, approx)) for x in list(range(300, 800, 25)) + list(range(1800, 2300, 25))]
        tops[dim] = [(x, y) for x, y in pts if y is not None]
    straight = {}
    for i, dim in enumerate(TRACK_ORDER):
        pts = np.array(tops[dim], float)
        slope, icpt = np.polyfit(pts[:, 0], pts[:, 1], 1)
        if dim == "range":  # its top edge is cut by the scanner: assume level
            slope, icpt = 0.0, 0.0
        y0 = int(max(0, icpt + min(0, slope * W) - 8))
        nxt = TRACK_ORDER[i + 1] if i + 1 < len(TRACK_ORDER) else None
        y1 = int(min(np.array(tops[nxt])[:, 1]) - 1) if nxt else H
        band = img[y0:y1].copy()
        ang = np.degrees(np.arctan(slope))
        ytop = (icpt - y0) + slope * W / 2  # the top edge, level after turning about this point
        m = cv2.getRotationMatrix2D((W / 2, ytop), ang, 1.0)
        rot = cv2.warpAffine(band, m, (W, band.shape[0]), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
        piece = ~is_background(rot)
        piece[: max(0, int(ytop) - 1)] = False  # the previous track's tab touches this top edge
        piece = cv2.morphologyEx(piece.astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
        cs, _ = cv2.findContours(piece, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        mask = np.zeros_like(piece)
        cv2.drawContours(mask, [c], -1, 255, -1)
        # Pull the cut 3 px inside the edge, so no scanner white rides along the outline.
        mask = cv2.erode(mask, np.ones((7, 7), np.uint8))
        cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        strip = rot[y:y + h, x:x + w].copy()
        local = c.reshape(-1, 2) - [x, y]
        poly = cv2.approxPolyDP(local.astype(np.float32).reshape(-1, 1, 2), 1.5, True).reshape(-1, 2)
        path = "M" + " L".join(f"{px:.1f} {py:.1f}" for px, py in poly) + " Z"
        # The body: rows where the strip spans most of its width; its left edge at the top.
        m2 = mask[y:y + h, x:x + w] > 0
        widths = m2.sum(1)
        body_rows = np.where(widths > 0.85 * w)[0]
        body_top, body_bottom = int(body_rows.min()), int(body_rows.max())
        row = m2[body_top + 60]
        body_left = int(np.argmax(row))
        TRACKS[dim] = {"path": path, "w": w, "h": h, "bodyLeft": body_left, "bodyTop": body_top, "bodyH": body_bottom - body_top}
        save(d, f"track_{dim}", strip)
        for p in range(0, 7):
            sw = START_W if p == 0 else SLOT_W
            cx = body_left + SLOT_DX0 + SLOT_PITCH * p
            save(slots, f"slot_{dim}_{p}", crop(strip, cx - sw / 2, body_top + SLOT_Y0, cx + sw / 2, body_top + SLOT_Y1), sheet=dim == "speed")
        straight[dim] = (strip, body_left, body_top)
    return straight


# ------------------------------------------------------------------------------------------
# Step patterns (A diamond lattice, B fine lines, C diagonal, D crosshatch): period-aligned
# patches cut from empty parts of track slots, so a face can tile them without seams.
# ------------------------------------------------------------------------------------------
STEP_PATCH = {  # (dimension, slot) whose lower band is plain pattern
    "A": ("reliability", 3), "B": ("speed", 5), "C": ("reliability", 1), "D": ("speed", 2),
}


# Diagonal (C) and crosshatch (D) patterns repeat every PERIOD px both ways, so three periods
# tile exactly. The diamond (A) and line (B) patterns are mirror-symmetric, so a 2x2 mirror of
# a patch tiles without seams. Every tile ends up ~170 px square: one factory square.
PERIOD = {"C": 29, "D": 29}


def patterns(strips):
    d = folder("patterns", {"default": {"maxWidth": 512, "format": "jpg"}})
    for step, (dim, slot) in STEP_PATCH.items():
        track_img, left, top = strips[dim]
        cx = left + SLOT_DX0 + SLOT_PITCH * slot
        y0 = top + 352  # the lower band of the slot, under the icon, clear of the corners
        if step in PERIOD:
            n = 3 * PERIOD[step]
            patch = crop(track_img, cx - n // 2, y0, cx - n // 2 + n, y0 + n)
            tile = np.vstack([np.hstack([patch, patch])] * 2)
        else:
            patch = crop(track_img, cx - 43, y0, cx + 42, y0 + 85)
            top_row = np.hstack([patch, cv2.flip(patch, 1)])
            tile = np.vstack([top_row, cv2.flip(top_row, 0)])
        save(d, f"step{step}", tile)


# ------------------------------------------------------------------------------------------
# Outlines traced from the pieces scan: brand pieces, car meeples, spark tiles.
# ------------------------------------------------------------------------------------------
MARKET_SCAN = "market pieces (and player tokens).jpeg"
BRANDS = {  # player colour: search box in the 2547x3507 scan
    "blue": (600, 2480, 820, 2760), "green": (900, 2500, 1140, 2740), "yellow": (1200, 2520, 1440, 2740),
    "red": (1480, 2480, 1690, 2740), "purple": (1770, 2480, 2000, 2740),
}
CARS = {"sports": (1200, 1980, 1460, 2130), "car": (1500, 1960, 1760, 2130), "truck": (1780, 2000, 2050, 2160)}
def piece_mask(region, sat=45):
    hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 1] > sat) | (hsv[..., 2] < 70)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    filled = np.zeros_like(m)
    cv2.drawContours(filled, [c], -1, 255, -1)
    return c, filled


def svg_path(contour, box=100.0, eps=1.2):
    """A contour as an SVG path scaled so its longer side is `box` units, y down."""
    c = contour.reshape(-1, 2).astype(float)
    x0, y0 = c.min(0)
    w, h = c.max(0) - c.min(0)
    s = box / max(w, h)
    pts = cv2.approxPolyDP(((c - [x0, y0]) * s).astype(np.float32).reshape(-1, 1, 2), eps, True).reshape(-1, 2)
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z", (w * s, h * s)


def mean_colour(region, mask):
    b, g, r = [int(v) for v in cv2.mean(region, mask=mask)[:3]]
    return f"#{r:02x}{g:02x}{b:02x}"


def pieces_scan():
    img = scan(MARKET_SCAN)
    out = {"brands": {}, "cars": {}}
    for colour, (x0, y0, x1, y1) in BRANDS.items():
        reg = crop(img, x0, y0, x1, y1)
        c, m = piece_mask(reg, 70)
        path, size = svg_path(c)
        out["brands"][colour] = {"path": path, "w": size[0], "h": size[1], "hex": mean_colour(reg, m)}
        SHEETS.append((f"brand {colour}", cv2.bitwise_and(reg, reg, mask=m)))
    for car, (x0, y0, x1, y1) in CARS.items():
        reg = crop(img, x0, y0, x1, y1)
        c, m = piece_mask(reg, 50)
        path, size = svg_path(c)
        out["cars"][car] = {"path": path, "w": size[0], "h": size[1], "hex": mean_colour(reg, m)}
        SHEETS.append((f"car {car}", cv2.bitwise_and(reg, reg, mask=m)))
    return out


def deskew(region, contour, inset=0):
    """Straighten a square-ish piece that lies a little rotated on the scan."""
    (cx, cy), _, ang = cv2.minAreaRect(contour)
    # Only ever undo a small tilt: fold the angle into (-45, 45] so a piece never turns a
    # quarter (minAreaRect reports an upright rectangle as 0 or 90 depending on its sides).
    ang = ((ang + 45) % 90) - 45
    m = cv2.getRotationMatrix2D((cx, cy), ang, 1.0)
    rot = cv2.warpAffine(region, m, (region.shape[1], region.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    pts = cv2.transform(contour.reshape(-1, 1, 2).astype(np.float32), m)
    x, y, w, h = cv2.boundingRect(pts)
    return crop(rot, x + inset, y + inset, x + w - inset, y + h - inset)


# ------------------------------------------------------------------------------------------
# Factory pieces scan (2496x3453): floors, mainlines, departments, dealership, indicators.
# Dealerships and the expansion lie upside down on the scan.
# ------------------------------------------------------------------------------------------
FACTORY_SCAN = "horseless factory pieces.jpeg"
FACTORY_PIECES = {  # name: (search box, rotation in quarter turns clockwise)
    "mainlineCar": ((2030, 1862, 2496, 2470), 3),
    "mainlineSports": ((1090, 2310, 1870, 2800), 0),
    "mainlineTruck": ((100, 180, 600, 1140), 1),
    # These two touch on the scan, so they are cut by box rather than by outline.
    "deptMarketing": ((1078, 1870, 1672, 2316), 0, "box"),
    "deptPlanning": ((1684, 1870, 1970, 2316), 2, "box"),  # lies upside down on the scan
    "deptResearch": ((1920, 2480, 2420, 2980), 3),  # lies a quarter turn clockwise on the scan
    "dealershipSmall": ((1820, 2960, 2470, 3453), 2),
    "dealershipMedium": ((0, 1310, 620, 1960), 2),
    "dealershipLarge": ((1000, 2800, 1800, 3453), 2),
}


def factory_scan():
    img = scan(FACTORY_SCAN)
    d = folder("pieces", {"default": {"maxWidth": 640, "maxHeight": 640, "format": "jpg"}})
    for name, spec in FACTORY_PIECES.items():
        (x0, y0, x1, y1), q = spec[0], spec[1]
        reg = crop(img, x0, y0, x1, y1)
        if len(spec) > 2:
            for _ in range(q):
                reg = cv2.rotate(reg, cv2.ROTATE_90_CLOCKWISE)
            save(d, name, reg)
            continue
        hsv = cv2.cvtColor(reg, cv2.COLOR_BGR2HSV)
        if name.startswith("floor"):
            # Black board: segment by darkness, or the scanner's shading joins the piece.
            m = (hsv[..., 2] < 120).astype(np.uint8) * 255
        else:
            # Pieces are anything darker or more saturated than the white scanner lid.
            m = ((hsv[..., 2] < 225) | (hsv[..., 1] > 40)).astype(np.uint8) * 255
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        piece = deskew(reg, c, inset=8 if name.startswith("floor") else 4)
        for _ in range(q):
            piece = cv2.rotate(piece, cv2.ROTATE_90_CLOCKWISE)
        if name.startswith("dealership"):
            # Dealership faces are drawn (name band, logo, dotted paper): only the paper ships,
            # one factory square of the large tile's body mirrored into a seamless tile.
            if name == "dealershipLarge":
                sq = piece.shape[1] / 5
                patch = crop(piece, sq * 1.5, sq * 1.6, sq * 2.5, sq * 2.6)
                top = np.hstack([patch, cv2.flip(patch, 1)])
                save(d, "dotPaper", np.vstack([top, cv2.flip(top, 0)]))
            continue
        save(d, name, piece)
        if name in MAINLINE_LETTERS:
            save(d, name + "Back", mainline_back(piece, MAINLINE_LETTERS[name]))
    marketing_colours(d)


# The players' colours (consts.ts playerHex). Marketing departments are printed in their
# owner's colour; the scan is the green player's.
PLAYER_HEX = {"red": "#c8302b", "blue": "#2c56b8", "purple": "#8a5bb5", "green": "#6cc24a", "yellow": "#e8c21a"}


def marketing_colours(d):
    """Recolour the green marketing tile for each player: only its green ground changes, by
    hue; saturation and brightness keep their printed variation (dots, speckle), scaled to
    the target colour, and the black line art is untouched."""
    img = cv2.imread(os.path.join(d, "deptMarketing.jpg"))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    green = (np.abs(hsv[..., 0] - 50) < 25) & (hsv[..., 1] > 40)
    ref_s, ref_v = np.median(hsv[green][:, 1]), np.median(hsv[green][:, 2])
    for colour, hexv in PLAYER_HEX.items():
        if colour == "green":
            save(d, "deptMarketing_green", img)
            continue
        r, g, b = int(hexv[1:3], 16), int(hexv[3:5], 16), int(hexv[5:7], 16)
        th, ts, tv = cv2.cvtColor(np.uint8([[[b, g, r]]]), cv2.COLOR_BGR2HSV)[0, 0].astype(np.float32)
        out = hsv.copy()
        out[..., 0][green] = th
        out[..., 1][green] = np.clip(hsv[..., 1][green] * ts / ref_s, 0, 255)
        out[..., 2][green] = np.clip(hsv[..., 2][green] * tv / ref_v, 0, 255)
        save(d, f"deptMarketing_{colour}", cv2.cvtColor(out.astype(np.uint8), cv2.COLOR_HSV2BGR))


# Where each step letter is printed on a mainline (fractions of the crop), read off the crops.
# Letters face outward from their own edge: A upright at the bottom, D upside down at the top,
# C and B turned toward the left and right edges.
MAINLINE_LETTERS = {
    "mainlineCar": {"D": (0.47, 0.12), "C": (0.05, 0.5), "B": (0.84, 0.49), "A": (0.47, 0.85)},
    "mainlineSports": {"D": (0.49, 0.13), "C": (0.055, 0.5), "B": (0.91, 0.47), "A": (0.5, 0.86)},
    "mainlineTruck": {"D": (0.51, 0.13), "C": (0.094, 0.5), "B": (0.94, 0.5), "A": (0.5, 0.86)},
}


def mainline_back(front, letters):
    """The back of a mainline is the front's mirror image (B and C change sides), but its
    letters still read the right way: each is stamped from the front, turned 180 degrees when
    it moves to the opposite edge."""
    h, w = front.shape[:2]
    back = cv2.flip(front, 1)
    r = int(0.09 * h)
    for step, (fx, fy) in letters.items():
        x, y = int(fx * w), int(fy * h)
        x0, y0 = max(0, x - r), max(0, y - r)
        patch = front[y0:y + r, x0:x + r].copy()
        if step in ("B", "C"):
            patch = cv2.rotate(patch, cv2.ROTATE_180)
        mx0 = max(0, w - (x0 + patch.shape[1]))
        back[y0:y0 + patch.shape[0], mx0:mx0 + patch.shape[1]] = patch[:, : w - mx0]
    return back


# ------------------------------------------------------------------------------------------
# Station icons: cut from the track slots (one per station), on the step pattern.
# ------------------------------------------------------------------------------------------
PRINTED = {
    "speed": ["engine", "horn", "hub", "tire", "fuelTank", "dashboard"],
    "reliability": ["battery", "chassis", "carBody", "bumper", "engine", "chassis"],
    "design": ["paint", "windscreen", "headlamp", "dashboard", "carBody", "steeringWheel"],
    "range": ["engine", "radiator", "tire", "fuelTank", "radiator", "hub"],
    "safety": ["brake", "windowPane", "steeringWheel", "bumper", "headlamp", "tire"],
}


def station_icons(strips):
    d = folder("stations", {"default": {"maxWidth": 240, "maxHeight": 240, "format": "png", "palette": True}})
    done = set()
    # Prefer slots without a punch clock (4 and 6) so no clock bleeds into the art.
    order = sorted(((p + 1 in (4, 6)), dim, p) for dim in TRACK_ORDER for p in range(6))
    for _, dim, p in order:
        sid = PRINTED[dim][p]
        if sid in done:
            continue
        done.add(sid)
        track_img, left, top = strips[dim]
        cx = left + SLOT_DX0 + SLOT_PITCH * (p + 1)
        reg = crop(track_img, cx - 120, top + 100, cx + 120, top + 335)
        save(d, sid, clear_letters(soft_edge(reg, 18)))


def clear_letters(rgba):
    """The crop's top corners hold the foot of the slot's printed step letter (and a
    neighbour's); the face prints its own letter there, so the scanned one would show as a
    ghost beside it (strongest when the face is drawn small). Fade both corners out; the
    illustrations sit in the middle and keep their full height."""
    h, w = rgba.shape[:2]
    band, side, ramp = 34, 58, 14
    ys = np.clip((np.arange(h, dtype=np.float32) - band) / ramp, 0, 1)[:, None]
    dx = np.minimum(np.arange(w), np.arange(w)[::-1]).astype(np.float32)
    xs = np.clip((dx - side) / ramp, 0, 1)[None, :]
    keep = np.maximum(ys, xs)
    rgba[..., 3] = (rgba[..., 3] * keep).astype(np.uint8)
    return rgba


def soft_edge(reg, r):
    """The crop with its border faded out, so it sits on a face tiled with the same step
    pattern without a hard seam."""
    h, w = reg.shape[:2]
    a = np.ones((h, w), np.float32)
    ramp = np.linspace(0, 1, r)
    a[:r, :] *= ramp[:, None]; a[-r:, :] *= ramp[::-1][:, None]
    a[:, :r] *= ramp[None, :]; a[:, -r:] *= ramp[::-1][None, :]
    rgba = cv2.cvtColor(reg, cv2.COLOR_BGR2BGRA)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    return rgba


def icon_alpha(reg):
    """The line-art icon with the step pattern knocked out: keep the icon's white fill and its
    heavy black outline (both are larger than the pattern's fine lines), as alpha."""
    g = cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY)
    white = (g > 215).astype(np.uint8) * 255
    black = (g < 60).astype(np.uint8) * 255
    white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    black = cv2.morphologyEx(black, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.dilate(cv2.bitwise_or(white, black), np.ones((5, 5), np.uint8))
    # Keep only blobs connected to the big icon shape, not stray pattern specks.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 400:
            keep[lab == i] = 255
    keep = cv2.GaussianBlur(keep, (5, 5), 0)
    rgba = cv2.cvtColor(reg, cv2.COLOR_BGR2BGRA)
    rgba[..., 3] = keep
    ys, xs = np.where(keep > 20)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


# ------------------------------------------------------------------------------------------
# Cards: the empty 4x4 grid, the year badge colour, the clock icon (from the card scans).
# ------------------------------------------------------------------------------------------
def cards():
    pass  # composed in CardFace from the board's niche crops; see src/canvas/CardFace.tsx


def write_ts(outlines):
    lines = [
        "// GENERATED by scripts/extract-art.py from the raw scans. Do not edit by hand.",
        "// Outlines are SVG paths (y down) traced from the real pieces; the tracks' printed layout",
        "// is in pixels of the rotated tracks scan. Board geometry is in src/generated.ts.",
        "",
        "// Each research track's own traced outline and printed layout, in its crop's pixels.",
        f"export const TRACK_OUTLINES = {json.dumps(TRACKS, indent=1)} as const;",
        f"export const TRACK_SLOT_PX = {{ dx0: {SLOT_DX0}, pitch: {SLOT_PITCH}, slotW: {SLOT_W}, startW: {START_W}, y0: {SLOT_Y0}, y1: {SLOT_Y1} }};",
        "",
        f"export const BRAND_OUTLINES = {json.dumps(outlines['brands'], indent=1)} as const;",
        f"export const CAR_OUTLINES = {json.dumps(outlines['cars'], indent=1)} as const;",
    ]
    with open(os.path.join(ROOT, "src", "outlines.ts"), "w") as fh:
        fh.write("\n".join(lines) + "\n")


def sheet():
    tiles = []
    for name, im in SHEETS:
        if im.ndim == 3 and im.shape[2] == 4:
            bg = np.full(im.shape[:2] + (3,), 200, np.uint8)
            a = im[..., 3:4] / 255.0
            im = (im[..., :3] * a + bg * (1 - a)).astype(np.uint8)
        s = 180 / max(im.shape[:2])
        t = cv2.resize(im, (max(1, int(im.shape[1] * s)), max(1, int(im.shape[0] * s))))
        tiles.append((name, t))
    cols = 8
    rows = (len(tiles) + cols - 1) // cols
    out = np.full((rows * 210, cols * 190, 3), 235, np.uint8)
    for i, (name, t) in enumerate(tiles):
        r, c = divmod(i, cols)
        out[r * 210: r * 210 + t.shape[0], c * 190: c * 190 + t.shape[1]] = t
        cv2.putText(out, name[-22:], (c * 190, r * 210 + 200), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)
    p = os.path.join(os.environ.get("SHEET_DIR", tempfile.gettempdir()), "art-sheet.jpg")
    cv2.imwrite(p, out)
    print("contact sheet:", p)


if __name__ == "__main__":
    t = tracks()
    patterns(t)
    station_icons(t)
    outlines = pieces_scan()
    factory_scan()
    write_ts(outlines)
    if "--sheet" in sys.argv:
        sheet()
