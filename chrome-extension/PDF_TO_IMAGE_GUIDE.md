# 📄 How to Convert Your PDF Solution to Images

Since Chrome extensions can't load external libraries for security reasons, you'll need to convert your PDF answer key to images first.

## Quick Methods

### Method 1: Online Converter (Fastest) ⭐
1. Go to https://pdf2png.com or https://www.ilovepdf.com/pdf_to_jpg
2. Upload your solution PDF
3. Download all pages as PNG or JPG
4. Upload these images to the extension

### Method 2: macOS Preview (Built-in)
1. Open your PDF in Preview
2. File → Export
3. Format: PNG or JPEG
4. Click "Save"
5. Repeat for each page (or use Command+A to select all pages)

### Method 3: Python Script (Automated)
If you have Python with pdf2image installed:

```python
from pdf2image import convert_from_path

# Convert PDF to images
images = convert_from_path('hw5_solution.pdf', dpi=200)

# Save each page
for i, image in enumerate(images):
    image.save(f'solution_page_{i+1}.png', 'PNG')

print(f"Converted {len(images)} pages!")
```

Install requirements:
```bash
pip install pdf2image
# On macOS: brew install poppler
# On Linux: sudo apt-get install poppler-utils
```

### Method 4: Using Your Existing Python Script
You already have pdf2image in your project! Use the enhanced_math_grader.py:

```python
from pdf2image import convert_from_path

# Convert your solution PDF
images = convert_from_path('assignments/hw5/hw5_solution.pdf', dpi=200)

# Save pages
for i, img in enumerate(images):
    img.save(f'solution_page_{i}.png', 'PNG')
```

## Recommended Settings
- **Format**: PNG (better quality) or JPG (smaller size)
- **DPI**: 150-200 (good balance of quality and file size)
- **Color**: RGB (for colored solutions)

## Tips
- Name files sequentially: `page_1.png`, `page_2.png`, etc.
- Keep image sizes reasonable (<2MB per image)
- Make sure text is readable when zoomed in
- You can upload multiple images at once in the extension

## After Converting
1. Open the extension popup
2. Click "Choose Files" under "Answer Key / Solution"
3. Select all your converted images (Ctrl/Cmd+Click to multi-select)
4. Click "Save Configuration"
5. You'll see "✓ X page(s) uploaded and ready"

Done! The AI will now compare student work against your solution images. 🎉
