import os
import math
import imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1280
HEIGHT = 720
FPS = 30
DURATION = 12 # 12 seconds
TOTAL_FRAMES = DURATION * FPS

# Colors
BG_COLOR = (15, 15, 20)
TEXT_COLOR = (243, 244, 246)
TEXT_DIM = (156, 163, 175)
ACCENT = (59, 130, 246)
SUCCESS = (16, 185, 129)
CARD_BG = (25, 25, 32)
GLASS_BORDER = (50, 50, 60)

# Try loading Windows fonts
try:
    font_xl = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 80)
    font_large = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 50)
    font_med = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 32)
    font_small = ImageFont.truetype("C:\\Windows\\Fonts\\segoeui.ttf", 20)
    font_mono = ImageFont.truetype("C:\\Windows\\Fonts\\consola.ttf", 24)
except Exception:
    font_xl = font_large = font_med = font_small = font_mono = ImageFont.load_default()

def ease_out(t):
    return 1 - pow(1 - t, 3)

def draw_rounded_rect(draw, xy, cornerradius, fill, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle((x0, y0, x1, y1), radius=cornerradius, fill=fill, outline=outline, width=width)

def render_frame(t):
    # t is time in seconds
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 0.0 - 2.5s: Intro
    if t < 3.0:
        alpha = min(1.0, t / 0.5) if t < 2.5 else max(0.0, 1.0 - (t - 2.5) / 0.5)
        y_offset = (1.0 - ease_out(min(1.0, t))) * 50
        
        # We manually simulate alpha blending by mixing colors
        r, g, b = TEXT_COLOR
        blend_text = (int(r*alpha + BG_COLOR[0]*(1-alpha)), 
                      int(g*alpha + BG_COLOR[1]*(1-alpha)), 
                      int(b*alpha + BG_COLOR[2]*(1-alpha)))
        
        ar, ag, ab = ACCENT
        blend_accent = (int(ar*alpha + BG_COLOR[0]*(1-alpha)), 
                        int(ag*alpha + BG_COLOR[1]*(1-alpha)), 
                        int(ab*alpha + BG_COLOR[2]*(1-alpha)))

        draw.text((WIDTH//2, HEIGHT//2 - 40 + y_offset), "Token Optimizer", font=font_xl, fill=blend_text, anchor="mm")
        draw.text((WIDTH//2, HEIGHT//2 + 50 + y_offset), "Stop paying for fluffy prompts.", font=font_med, fill=blend_accent, anchor="mm")

    # 3.0 - 12.0s: Action Demo
    if t >= 3.0:
        demo_t = t - 3.0
        
        # 1. Background Chat UI
        draw_rounded_rect(draw, (100, 100, WIDTH-100, HEIGHT-100), 16, (20, 20, 25), GLASS_BORDER)
        draw.text((130, 130), "ChatGPT", font=font_med, fill=TEXT_COLOR)
        
        # Chat history mock
        draw_rounded_rect(draw, (WIDTH-400, 200, WIDTH-130, 280), 12, (40, 40, 50))
        draw.text((WIDTH-380, 220), "Can you summarize the PDF?", font=font_small, fill=TEXT_COLOR)
        
        # Input Box
        draw_rounded_rect(draw, (130, HEIGHT-200, WIDTH-130, HEIGHT-130), 24, (30, 30, 35), GLASS_BORDER)

        # Typing Animation
        full_text = "I would like you to please provide me with a summary..."
        type_chars = int((demo_t - 0.5) * 20)  # slightly delayed start
        type_chars = max(0, min(len(full_text), type_chars))
        current_text = full_text[:type_chars] + ("|" if demo_t % 0.5 < 0.25 else "")
        draw.text((150, HEIGHT-180), current_text, font=font_med, fill=TEXT_COLOR)

        # 2. Token Optimizer Dashboard Pop-in (starts at 4.5s)
        if demo_t > 1.5:
            dashboard_t = demo_t - 1.5
            dash_scale = ease_out(min(1.0, dashboard_t * 2))
            
            # Dashboard position
            dx, dy = WIDTH - 450, HEIGHT - 550
            dw, dh = 300, 380
            
            # Slide up effect
            dy = dy + (1.0 - dash_scale) * 100
            
            draw_rounded_rect(draw, (dx, dy, dx+dw, dy+dh), 16, CARD_BG, GLASS_BORDER, 2)
            draw.text((dx+20, dy+20), "⚡ Token Optimizer", font=font_small, fill=ACCENT)
            
            # Stats Calculate effect
            tokens = math.ceil(type_chars / 4)
            cost = tokens * 0.0000025
            
            # Stat Cards
            draw_rounded_rect(draw, (dx+20, dy+60, dx+140, dy+140), 8, (30, 30, 35))
            draw.text((dx+80, dy+90), f"{tokens}", font=font_large, fill=TEXT_COLOR, anchor="mm")
            draw.text((dx+80, dy+120), "TOKENS", font=font_small, fill=TEXT_DIM, anchor="mm")

            draw_rounded_rect(draw, (dx+160, dy+60, dx+280, dy+140), 8, (30, 30, 35))
            draw.text((dx+220, dy+90), f"${cost:.4f}", font=font_med, fill=ACCENT, anchor="mm")
            draw.text((dx+220, dy+120), "EST. COST", font=font_small, fill=TEXT_DIM, anchor="mm")

            # Optimization kicks in at t=6.5 (demo_t = 3.5)
            if demo_t > 3.5:
                # Optimized values
                opt_tokens = math.ceil(11 / 4) # "Summarize..."
                opt_cost = opt_tokens * 0.0000025
                save_tokens = tokens - opt_tokens
                save_cost = cost - opt_cost
                
                # Show comparison table
                draw.text((dx+20, dy+170), "💰 Cost Comparison", font=font_small, fill=TEXT_COLOR)
                
                # Original Row
                draw_rounded_rect(draw, (dx+20, dy+200, dx+280, dy+235), 6, (40, 40, 45))
                draw.text((dx+30, dy+208), "Original", font=font_small, fill=TEXT_DIM)
                draw.text((dx+270, dy+208), f"${cost:.5f}", font=font_mono, fill=TEXT_COLOR, anchor="ra")

                # Optimized Row
                draw_rounded_rect(draw, (dx+20, dy+240, dx+280, dy+275), 6, (40, 45, 50), outline=ACCENT)
                draw.text((dx+30, dy+248), "Optimized", font=font_small, fill=TEXT_DIM)
                draw.text((dx+270, dy+248), f"${opt_cost:.5f}", font=font_mono, fill=SUCCESS, anchor="ra")

                # Savings Row
                draw_rounded_rect(draw, (dx+20, dy+280, dx+280, dy+315), 6, (30, 50, 40), outline=SUCCESS)
                draw.text((dx+30, dy+288), "You Save", font=font_small, fill=TEXT_DIM)
                draw.text((dx+270, dy+288), f"${save_cost:.5f}", font=font_mono, fill=SUCCESS, anchor="ra")
                
                # Button
                draw_rounded_rect(draw, (dx+20, dy+330, dx+280, dy+370), 8, ACCENT)
                draw.text((dx+150, dy+340), "Optimize Prompt", font=font_small, fill=(255,255,255), anchor="mt")
        
        # 3. Apply Optimization (starts at 8.0s -> demo_t = 5.0)
        if demo_t > 5.5:
            # Change input box text
            draw_rounded_rect(draw, (130, HEIGHT-200, WIDTH-130, HEIGHT-130), 24, (30, 30, 35), GLASS_BORDER)
            draw.text((150, HEIGHT-180), "Summarize...", font=font_med, fill=SUCCESS)
            
            # Show a checkmark overlay
            check_t = demo_t - 5.5
            check_scale = min(1.0, check_t * 3)
            if check_scale > 0:
                draw.text((WIDTH//2, HEIGHT//2), "✔ Optimized!", font=font_xl, fill=SUCCESS, anchor="mm")

    return img

print("Starting video render...")
writer = imageio.get_writer("promo_video.mp4", fps=FPS, quality=8, macro_block_size=None)

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS
    img = render_frame(t)
    writer.append_data(np.array(img))
    if frame_idx % 30 == 0:
        print(f"Rendered {t:.1f}s / {DURATION}s")

writer.close()
print("Saved to promo_video.mp4!")
