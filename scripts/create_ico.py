"""
SVG to ICO converter using PIL
Run: python scripts/create_ico.py
"""
import os
import sys

try:
    from PIL import Image
    import cairosvg
    from io import BytesIO
except ImportError:
    print("Installing required packages...")
    os.system("pip install pillow cairosvg")
    from PIL import Image
    import cairosvg
    from io import BytesIO

def svg_to_ico(svg_path, ico_path):
    """Convert SVG to ICO with multiple sizes"""

    # Read SVG and convert to PNG
    png_data = cairosvg.svg2png(url=svg_path, output_width=256, output_height=256)

    # Open as PIL Image
    img = Image.open(BytesIO(png_data))

    # Create multiple sizes for ICO
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # Save as ICO with multiple sizes
    img.save(ico_path, format='ICO', sizes=sizes)
    print(f"Created: {ico_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    svg_path = os.path.join(project_dir, "assets", "icon.svg")
    ico_path = os.path.join(project_dir, "assets", "icon.ico")

    if os.path.exists(svg_path):
        svg_to_ico(svg_path, ico_path)
    else:
        print(f"SVG not found: {svg_path}")
        sys.exit(1)
