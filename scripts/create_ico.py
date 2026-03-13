"""
PNG/SVG to ICO converter
간단한 ICO 생성 스크립트
"""
import os
import sys

# PIL만 사용
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    os.system("pip install pillow")
    from PIL import Image, ImageDraw

def create_icon_from_scratch(ico_path):
    """프로그래밍으로 아이콘 생성 (SVG 대신)"""

    # 256x256 이미지 생성
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 배경 원 (남색)
    draw.ellipse([8, 8, 248, 248], fill=(40, 53, 147))

    # 절임조 몸체 (파란색)
    draw.rounded_rectangle([50, 70, 206, 190], radius=10, fill=(74, 144, 217))

    # 절임조 상단 테두리
    draw.rounded_rectangle([40, 60, 216, 80], radius=5, fill=(92, 107, 192))

    # 물/염수 (하늘색)
    draw.rectangle([55, 90, 201, 185], fill=(135, 206, 235))

    # 배추 1 (왼쪽)
    draw.ellipse([70, 120, 110, 155], fill=(139, 195, 74))
    draw.ellipse([78, 125, 102, 145], fill=(156, 204, 101))

    # 배추 2 (가운데)
    draw.ellipse([108, 130, 158, 170], fill=(139, 195, 74))
    draw.ellipse([118, 135, 148, 158], fill=(156, 204, 101))

    # 배추 3 (오른쪽)
    draw.ellipse([150, 118, 192, 152], fill=(139, 195, 74))
    draw.ellipse([158, 123, 184, 143], fill=(156, 204, 101))

    # 디지털 디스플레이
    draw.rounded_rectangle([65, 195, 191, 230], radius=5, fill=(13, 27, 42))
    draw.rounded_rectangle([70, 200, 186, 225], radius=3, fill=(27, 38, 59))

    # LED 점 (녹색, 빨간색)
    draw.ellipse([75, 208, 85, 218], fill=(0, 255, 136))
    draw.ellipse([171, 208, 181, 218], fill=(255, 107, 107))

    # 다리
    draw.rounded_rectangle([60, 185, 75, 215], radius=3, fill=(55, 71, 79))
    draw.rounded_rectangle([181, 185, 196, 215], radius=3, fill=(55, 71, 79))

    # ICO 파일로 저장 (여러 크기 포함)
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    # 각 크기로 리사이즈된 이미지 생성
    images = []
    for s in sizes:
        resized = img.resize(s, Image.Resampling.LANCZOS)
        images.append(resized)

    # ICO 저장
    img.save(ico_path, format='ICO', sizes=[(s, s) for s, _ in sizes])
    print(f"Created: {ico_path}")

    # PNG도 저장 (확인용)
    png_path = ico_path.replace('.ico', '.png')
    img.save(png_path, format='PNG')
    print(f"Created: {png_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    ico_path = os.path.join(project_dir, "assets", "icon.ico")

    create_icon_from_scratch(ico_path)
    print("Done!")
