#!/usr/bin/env python3
"""
Generate a sleek, modern, ultra-clean hardware wiring diagram
directly inspired by the PyDarts connection overview with straight direct lines,
smooth non-overlapping curves, glowing neon accents, and zero staircase clutter.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

SCALE = 2
WIDTH, HEIGHT = 1400 * SCALE, 750 * SCALE

# Palette
BG_COLOR = (11, 15, 25)          # Deep cyber dark #0b0f19
GRID_COLOR = (20, 28, 45)
CARD_BG = (19, 26, 42)
CARD_BORDER = (45, 60, 90)

ARDUINO_TEAL = (0, 150, 145)      # Sleek Arduino turquoise
ARDUINO_BORDER = (0, 100, 95)
HEADER_BG = (15, 20, 30)
PIN_GOLD = (245, 190, 35)

TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (148, 163, 184)

# Ribbon Amber / Polyimide
RIBBON_BG = (234, 88, 12)
RIBBON_GRADIENT = (249, 115, 22)
RIBBON_TRACE = (254, 215, 170)
CONNECTOR_BLACK = (18, 22, 32)
CONNECTOR_BORDER = (55, 65, 85)

# Glowing Wire Colors
WIRE_ROW = (56, 189, 248)         # Electric Cyan
WIRE_ROW_GLOW = (56, 189, 248, 45)
WIRE_COL = (74, 222, 128)         # Electric Green
WIRE_COL_GLOW = (74, 222, 128, 45)
WIRE_BTN_P = (34, 197, 94)        # Emerald
WIRE_BTN_U = (250, 204, 21)       # Amber Gold
WIRE_GND = (156, 163, 175)        # Metallic Slate

img = Image.new('RGBA', (WIDTH, HEIGHT), BG_COLOR)
draw = ImageDraw.Draw(img)

# Load fonts
try:
    font_title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24 * SCALE)
    font_badge = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40 * SCALE)
    font_bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16 * SCALE)
    font_semi = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13 * SCALE)
    font_mono = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12 * SCALE)
    font_sub = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12 * SCALE)
except Exception:
    font_title = font_badge = font_bold = font_semi = font_mono = font_sub = ImageFont.load_default()

# -------------------------------------------------------------
# 1. Background Grid & Header
# -------------------------------------------------------------
for x in range(0, WIDTH, 35 * SCALE):
    draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=1)
for y in range(0, HEIGHT, 35 * SCALE):
    draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=1)

draw.text((45 * SCALE, 28 * SCALE), "CÂBLAGE MATRICIEL ARDUINO UNO", fill=TEXT_WHITE, font=font_title)
draw.text((45 * SCALE, 58 * SCALE), "Schéma officiel DartOTron : connexion directe des 2 nappes et des boutons d'arcade", fill=TEXT_MUTED, font=font_sub)

# -------------------------------------------------------------
# 2. Central Arduino Uno Board
# -------------------------------------------------------------
ard_x = int(WIDTH * 0.43)
ard_y = int(HEIGHT * 0.16)
ard_w = int(280 * SCALE)
ard_h = int(480 * SCALE)
r = 14 * SCALE

# Shadow
draw.rounded_rectangle([ard_x + 6*SCALE, ard_y + 8*SCALE, ard_x + ard_w + 6*SCALE, ard_y + ard_h + 8*SCALE], radius=r, fill=(4, 7, 14, 200))
# PCB Body
draw.rounded_rectangle([ard_x, ard_y, ard_x + ard_w, ard_y + ard_h], radius=r, fill=ARDUINO_TEAL, outline=ARDUINO_BORDER, width=3*SCALE)

# Corner Mounting Holes
for hx, hy in [(ard_x + 16*SCALE, ard_y + 16*SCALE), (ard_x + ard_w - 16*SCALE, ard_y + 16*SCALE), (ard_x + 16*SCALE, ard_y + ard_h - 16*SCALE), (ard_x + ard_w - 16*SCALE, ard_y + ard_h - 16*SCALE)]:
    draw.circle((hx, hy), 7*SCALE, fill=(200, 160, 40), outline=(50, 40, 10), width=1)
    draw.circle((hx, hy), 4*SCALE, fill=(11, 15, 25))

# Text Branding
draw.text((ard_x + ard_w // 2, ard_y + 175 * SCALE), "ARDUINO", fill=(255, 255, 255, 210), font=font_bold, anchor="mm")
draw.text((ard_x + ard_w // 2, ard_y + 200 * SCALE), "UNO R3", fill=(254, 240, 138, 240), font=font_semi, anchor="mm")

# MCU chip ATmega328P
chip_w, chip_h = 74 * SCALE, 110 * SCALE
chip_x = ard_x + (ard_w - chip_w) // 2
chip_y = ard_y + 260 * SCALE
draw.rounded_rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], radius=4*SCALE, fill=(20, 24, 32), outline=(5, 8, 12), width=2*SCALE)
draw.text((chip_x + chip_w // 2, chip_y + chip_h // 2), "ATmega\n328P", fill=(148, 163, 184), font=font_mono, anchor="mm", align="center")

# USB Port at bottom center
usb_w, usb_h = 56 * SCALE, 46 * SCALE
usb_x = ard_x + (ard_w - usb_w) // 2
usb_y = ard_y + ard_h - usb_h // 2
draw.rounded_rectangle([usb_x, usb_y - 10*SCALE, usb_x + usb_w, usb_y + usb_h - 10*SCALE], radius=4*SCALE, fill=(148, 163, 184), outline=(71, 85, 105), width=2*SCALE)
draw.text((usb_x + usb_w // 2, usb_y + 12*SCALE), "USB PC", fill=(15, 23, 42), font=font_mono, anchor="mm")

# Blue USB Cable extending down
draw.line([(usb_x + usb_w // 2, usb_y + usb_h - 10*SCALE), (usb_x + usb_w // 2, HEIGHT)], fill=(37, 99, 235), width=10*SCALE)

# -------------------------------------------------------------
# Headers on Arduino:
# Header X (Left): A0 to A5 + GND
# Header Y (Right): Digital 0 to 13
# -------------------------------------------------------------
head_left_x = ard_x + 14 * SCALE
head_right_x = ard_x + ard_w - 34 * SCALE

# Left Header (X)
draw.rounded_rectangle([head_left_x, ard_y + 40*SCALE, head_left_x + 20*SCALE, ard_y + 360*SCALE], radius=3*SCALE, fill=HEADER_BG, outline=(50, 60, 75), width=1*SCALE)
draw.text((head_left_x + 10*SCALE, ard_y + 25*SCALE), "X", fill=WIRE_ROW, font=font_bold, anchor="mm")

pin_left_coords = {}
left_labels = ["A0", "A1", "A2", "A3", "A4", "A5", "GND"]
for i, name in enumerate(left_labels):
    py = ard_y + (65 + i * 42) * SCALE
    draw.rectangle([head_left_x + 3*SCALE, py - 6*SCALE, head_left_x + 17*SCALE, py + 6*SCALE], fill=PIN_GOLD)
    draw.text((head_left_x + 30*SCALE, py), name, fill=TEXT_WHITE, font=font_mono, anchor="lm")
    pin_left_coords[name] = (head_left_x, py)

# Right Header (Y)
draw.rounded_rectangle([head_right_x, ard_y + 35*SCALE, head_right_x + 20*SCALE, ard_y + 445*SCALE], radius=3*SCALE, fill=HEADER_BG, outline=(50, 60, 75), width=1*SCALE)
draw.text((head_right_x + 10*SCALE, ard_y + 20*SCALE), "Y", fill=WIRE_COL, font=font_bold, anchor="mm")

pin_right_coords = {}
right_labels = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]
for i, name in enumerate(right_labels):
    py = ard_y + (50 + i * 28) * SCALE
    draw.rectangle([head_right_x + 3*SCALE, py - 5*SCALE, head_right_x + 17*SCALE, py + 5*SCALE], fill=PIN_GOLD)
    draw.text((head_right_x - 10*SCALE, py), name, fill=TEXT_WHITE, font=font_mono, anchor="rm")
    pin_right_coords[name] = (head_right_x + 20*SCALE, py)

# -------------------------------------------------------------
# 3. Nappe A (Lignes) on the Left
# -------------------------------------------------------------
ribbon_a_w = 260 * SCALE
ribbon_a_h = 260 * SCALE
ribbon_a_x = 40 * SCALE
ribbon_a_y = int(HEIGHT * 0.20)

draw.rounded_rectangle([ribbon_a_x, ribbon_a_y, ribbon_a_x + ribbon_a_w, ribbon_a_y + ribbon_a_h], radius=6*SCALE, fill=RIBBON_BG, outline=(194, 65, 12), width=3*SCALE)
for i in range(8):
    ty = ribbon_a_y + (18 + i * 32) * SCALE
    draw.line([(ribbon_a_x, ty), (ribbon_a_x + ribbon_a_w, ty)], fill=RIBBON_TRACE, width=4*SCALE)

conn_a_x = ribbon_a_x + ribbon_a_w
conn_w = 26 * SCALE
draw.rounded_rectangle([conn_a_x - 4*SCALE, ribbon_a_y - 6*SCALE, conn_a_x + conn_w, ribbon_a_y + ribbon_a_h + 6*SCALE], radius=4*SCALE, fill=CONNECTOR_BLACK, outline=CONNECTOR_BORDER, width=2*SCALE)

draw.text((ribbon_a_x + ribbon_a_w // 2, ribbon_a_y + ribbon_a_h // 2), "A", fill=(255, 255, 255, 240), font=font_badge, anchor="mm")
draw.text((ribbon_a_x + ribbon_a_w // 2, ribbon_a_y + ribbon_a_h + 24*SCALE), "Nappe A : LIGNES (8 fils)", fill=WIRE_ROW, font=font_bold, anchor="mm")

nappe_a_pins = []
for i in range(8):
    py = ribbon_a_y + (18 + i * 32) * SCALE
    px = conn_a_x + conn_w
    nappe_a_pins.append((px, py))
    draw.circle((px, py), 4*SCALE, fill=PIN_GOLD)

# -------------------------------------------------------------
# 4. Nappe B (Colonnes) on the Right
# Align vertically with Digital pins 4..11 for DIRECT STRAIGHT LINES!
# -------------------------------------------------------------
d4_y = pin_right_coords["4"][1]
d11_y = pin_right_coords["11"][1]

ribbon_b_w = 260 * SCALE
ribbon_b_h = 240 * SCALE
ribbon_b_x = WIDTH - ribbon_b_w - 40 * SCALE
ribbon_b_y = d4_y - 12 * SCALE

draw.rounded_rectangle([ribbon_b_x, ribbon_b_y, ribbon_b_x + ribbon_b_w, ribbon_b_y + ribbon_b_h], radius=6*SCALE, fill=RIBBON_BG, outline=(194, 65, 12), width=3*SCALE)
for i in range(8):
    ty = pin_right_coords[str(4 + i)][1]
    draw.line([(ribbon_b_x, ty), (ribbon_b_x + ribbon_b_w, ty)], fill=RIBBON_TRACE, width=4*SCALE)

conn_b_x = ribbon_b_x - conn_w
draw.rounded_rectangle([conn_b_x, ribbon_b_y - 6*SCALE, conn_b_x + conn_w + 4*SCALE, ribbon_b_y + ribbon_b_h + 6*SCALE], radius=4*SCALE, fill=CONNECTOR_BLACK, outline=CONNECTOR_BORDER, width=2*SCALE)

draw.text((ribbon_b_x + ribbon_b_w // 2, ribbon_b_y + ribbon_b_h // 2), "B", fill=(255, 255, 255, 240), font=font_badge, anchor="mm")
draw.text((ribbon_b_x + ribbon_b_w // 2, ribbon_b_y + ribbon_b_h + 24*SCALE), "Nappe B : COLONNES (8 fils)", fill=WIRE_COL, font=font_bold, anchor="mm")

nappe_b_pins = []
for i in range(8):
    py = pin_right_coords[str(4 + i)][1]
    px = conn_b_x
    nappe_b_pins.append((px, py))
    draw.circle((px, py), 4*SCALE, fill=PIN_GOLD)

# -------------------------------------------------------------
# 5. STRAIGHT DIRECT WIRES from Nappe B -> Digital Pins 4..11
# ZERO STAIRS, ZERO OVERLAPS!
# -------------------------------------------------------------
wire_w = int(3.5 * SCALE)
glow_w = int(7 * SCALE)

for i in range(8):
    start = nappe_b_pins[i]
    target = pin_right_coords[str(4 + i)]
    # Glow halo
    draw.line([start, target], fill=(34, 197, 94, 60), width=glow_w)
    # Core wire
    draw.line([start, target], fill=WIRE_COL, width=wire_w)
    draw.circle(start, 5*SCALE, fill=WIRE_COL)
    draw.circle(target, 5*SCALE, fill=WIRE_COL)

# -------------------------------------------------------------
# 6. DIRECT STRAIGHT WIRES from Nappe A (0..5) -> A0..A5
# ZERO STAIRS, ZERO OVERLAPS!
# -------------------------------------------------------------
for i in range(6):
    start = nappe_a_pins[i]
    target = pin_left_coords[f"A{i}"]
    draw.line([start, target], fill=(56, 189, 248, 60), width=glow_w)
    draw.line([start, target], fill=WIRE_ROW, width=wire_w)
    draw.circle(start, 5*SCALE, fill=WIRE_ROW)
    draw.circle(target, 5*SCALE, fill=WIRE_ROW)

# -------------------------------------------------------------
# 7. Clean Non-Overlapping Loops for Nappe A Pins 6 & 7 -> Digital 2 & 3
# -------------------------------------------------------------
start6 = nappe_a_pins[6]
target2 = pin_right_coords["2"]
loop_y1 = ard_y + ard_h + 40 * SCALE
path6 = [start6, (start6[0] + 45*SCALE, start6[1]), (start6[0] + 45*SCALE, loop_y1), (ard_x + ard_w + 35*SCALE, loop_y1), (ard_x + ard_w + 35*SCALE, target2[1]), target2]
draw.line(path6, fill=(56, 189, 248, 50), width=glow_w)
draw.line(path6, fill=WIRE_ROW, width=wire_w)
draw.circle(start6, 5*SCALE, fill=WIRE_ROW)
draw.circle(target2, 5*SCALE, fill=WIRE_ROW)

start7 = nappe_a_pins[7]
target3 = pin_right_coords["3"]
loop_y2 = ard_y + ard_h + 60 * SCALE
path7 = [start7, (start7[0] + 25*SCALE, start7[1]), (start7[0] + 25*SCALE, loop_y2), (ard_x + ard_w + 55*SCALE, loop_y2), (ard_x + ard_w + 55*SCALE, target3[1]), target3]
draw.line(path7, fill=(56, 189, 248, 50), width=glow_w)
draw.line(path7, fill=WIRE_ROW, width=wire_w)
draw.circle(start7, 5*SCALE, fill=WIRE_ROW)
draw.circle(target3, 5*SCALE, fill=WIRE_ROW)

# -------------------------------------------------------------
# 8. Arcade Buttons (Bottom Right)
# Non-overlapping clean routing to Pin 12, Pin 13 and GND
# -------------------------------------------------------------
btn_panel_x = WIDTH - 330 * SCALE
btn_panel_y = int(HEIGHT * 0.62)
btn_panel_w = 290 * SCALE
btn_panel_h = 225 * SCALE

draw.rounded_rectangle([btn_panel_x, btn_panel_y, btn_panel_x + btn_panel_w, btn_panel_y + btn_panel_h], radius=8*SCALE, fill=CARD_BG, outline=CARD_BORDER, width=2*SCALE)
draw.text((btn_panel_x + btn_panel_w // 2, btn_panel_y + 18*SCALE), "BOUTONS D'ARCADE", fill=TEXT_WHITE, font=font_bold, anchor="mm")

# Button 1: Joueur Suivant
b1_cx = btn_panel_x + 65 * SCALE
b1_cy = btn_panel_y + 80 * SCALE
draw.circle((b1_cx, b1_cy), 32*SCALE, fill=(20, 83, 45), outline=(34, 197, 94), width=3*SCALE)
draw.circle((b1_cx, b1_cy), 22*SCALE, fill=(34, 197, 94))
draw.text((b1_cx + 42*SCALE, b1_cy - 8*SCALE), "Joueur Suiv.", fill=TEXT_WHITE, font=font_semi, anchor="lm")
draw.text((b1_cx + 42*SCALE, b1_cy + 10*SCALE), "Broche 12 + GND", fill=TEXT_MUTED, font=font_sub, anchor="lm")

# Button 2: Annuler
b2_cx = btn_panel_x + 65 * SCALE
b2_cy = btn_panel_y + 160 * SCALE
draw.circle((b2_cx, b2_cy), 32*SCALE, fill=(113, 63, 18), outline=(234, 179, 8), width=3*SCALE)
draw.circle((b2_cx, b2_cy), 22*SCALE, fill=(234, 179, 8))
draw.text((b2_cx + 42*SCALE, b2_cy - 8*SCALE), "Annuler", fill=TEXT_WHITE, font=font_semi, anchor="lm")
draw.text((b2_cx + 42*SCALE, b2_cy + 10*SCALE), "Broche 13 + GND", fill=TEXT_MUTED, font=font_sub, anchor="lm")

# Routing Button 1 -> Pin 12
b1_sig = (b1_cx - 32*SCALE, b1_cy)
target12 = pin_right_coords["12"]
path_b1 = [b1_sig, (ard_x + ard_w + 80*SCALE, b1_cy), (ard_x + ard_w + 80*SCALE, target12[1]), target12]
draw.line(path_b1, fill=(34, 197, 94, 50), width=glow_w)
draw.line(path_b1, fill=WIRE_BTN_P, width=wire_w)
draw.circle(b1_sig, 5*SCALE, fill=WIRE_BTN_P)
draw.circle(target12, 5*SCALE, fill=WIRE_BTN_P)

# Routing Button 2 -> Pin 13
b2_sig = (b2_cx - 32*SCALE, b2_cy)
target13 = pin_right_coords["13"]
path_b2 = [b2_sig, (ard_x + ard_w + 98*SCALE, b2_cy), (ard_x + ard_w + 98*SCALE, target13[1]), target13]
draw.line(path_b2, fill=(250, 204, 21, 50), width=glow_w)
draw.line(path_b2, fill=WIRE_BTN_U, width=wire_w)
draw.circle(b2_sig, 5*SCALE, fill=WIRE_BTN_U)
draw.circle(target13, 5*SCALE, fill=WIRE_BTN_U)

# Common GND line connecting both buttons to Arduino GND (on left header)
b1_gnd = (b1_cx, b1_cy + 32*SCALE)
b2_gnd = (b2_cx, b2_cy + 32*SCALE)
target_gnd = pin_left_coords["GND"]
gnd_bus_x = ard_x - 30 * SCALE
gnd_bus_y = ard_y + ard_h + 85 * SCALE

path_gnd = [b1_gnd, (b1_cx, gnd_bus_y), (gnd_bus_x, gnd_bus_y), (gnd_bus_x, target_gnd[1]), target_gnd]
draw.line(path_gnd, fill=WIRE_GND, width=wire_w)
draw.line([b2_gnd, (b2_cx, gnd_bus_y)], fill=WIRE_GND, width=wire_w)
draw.circle(b1_gnd, 5*SCALE, fill=WIRE_GND)
draw.circle(b2_gnd, 5*SCALE, fill=WIRE_GND)
draw.circle(target_gnd, 5*SCALE, fill=WIRE_GND)
draw.text((gnd_bus_x + 12*SCALE, gnd_bus_y - 12*SCALE), "Masse commune GND", fill=WIRE_GND, font=font_sub)

# -------------------------------------------------------------
# 9. Downscale and Save WebP
# -------------------------------------------------------------
final_img = img.resize((WIDTH // SCALE, HEIGHT // SCALE), Image.Resampling.LANCZOS)
output_path = Path(__file__).resolve().parent.parent / 'docs/assets/hardware/arduino-wiring.webp'
final_img.save(output_path, 'WEBP', quality=95)
print(f"Updated {output_path}")
