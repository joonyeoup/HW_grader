# 🔧 Storage Limit Fix - Answer Key Images

## The Problem

You uploaded 7 answer key images and the popup showed "✓ 7 page(s) uploaded and ready", but the extension couldn't find them when grading.

**Root Cause**: Chrome `storage.sync` has a **very small limit** (~8KB per item, 100KB total). Your 7 images as base64 were probably **several megabytes**, so the save operation was **failing silently**.

## The Solution

Changed storage strategy:
- **API key & rubric text** → `storage.sync` (small data, syncs across devices)
- **Answer key images** → `storage.local` (large data, 10MB limit, stays on this device)

## What Changed

### Files Modified:
1. **popup.js** - Now saves images to `storage.local`
2. **content.js** - Now reads images from `storage.local`
3. **debug_storage.html** - Now checks both storage locations

### Storage Limits:
| Storage Type | Max Size | Use Case |
|--------------|----------|----------|
| `storage.sync` | 8KB per item, 100KB total | API keys, text configs |
| `storage.local` | 10MB total | Images, large files |

## ✅ How to Fix Your Extension

### Step 1: Reload Extension
```
1. Go to chrome://extensions/
2. Find "Gradescope AI Grader"
3. Click the reload icon (circular arrow)
```

### Step 2: Re-upload Answer Key
```
1. Click extension icon (top-right of Chrome)
2. Scroll to "Answer Key / Solution"
3. Click "Choose Files" → Select your 7 images
4. Click "Save Configuration" button
5. Check the popup console (F12) for save confirmation
```

**Expected logs in popup console**:
```
💾 Saving configuration...
  - Answer key images: 7
  - Total answer key size: 3542891 characters (~ 3459 KB)
✅ Sync storage saved (API key, rubric)
✅ Local storage saved (answer key images)
```

### Step 3: Verify Storage
Open debug page:
```
chrome-extension://[YOUR_EXTENSION_ID]/debug_storage.html
```

Click "Check Storage" - you should see:
```
From Local Storage (large files, this device only):
  Answer Key Images: ✓ 7 images

  Total size: 3542891 characters (~3459 KB)
  Image sizes:
    - Image 1: 523847 chars (~511 KB)
    - Image 2: 498562 chars (~486 KB)
    ...
```

### Step 4: Test Grading
```
1. Refresh Gradescope page (F5)
2. Click "AI Grade All"
3. Check console - should show answer key loaded
```

## 🚨 What If Images Are Still Too Large?

If you get an error: **"Answer key images are too large (XXmb). Maximum is 10MB"**

### Solution: Reduce Image Size

Your images are probably high-resolution (200+ DPI). Reduce them:

1. **Re-export at lower DPI**:
   - If using pdf2image: `dpi=100` instead of `dpi=200`
   - If using online converter: Choose "Low quality" or "Web quality"

2. **Compress existing images**:
   - Use https://tinypng.com or https://squoosh.app
   - Target: < 1MB per image for 7 images

3. **Split into multiple questions**:
   - Instead of uploading all 7 pages at once
   - Upload relevant pages per question when grading that question

## 🔍 Debugging Tips

### Check popup console during save:
```
F12 on popup → Console tab

Look for:
✅ "Local storage saved (answer key images)" = SUCCESS
❌ "Save failed: ..." = ERROR (will show reason)
```

### Check if images are stored:
```
chrome-extension://[YOUR_ID]/debug_storage.html

Should show:
✅ Answer key is properly stored!
```

### Check if images are loaded during grading:
```
F12 on Gradescope page → Console tab

Look for:
✅✅✅ ANSWER KEY LOADED SUCCESSFULLY! ✅✅✅
  - Number of pages: 7
```

### Check background console:
```
chrome://extensions/ → "service worker" link

Look for:
✅✅✅ ANSWER KEY IMAGES AVAILABLE! ✅✅✅
  - Number of images: 7
```

## 📊 Size Estimation

**Rough formula**:
- File size on disk (MB) × 1.4 = Base64 size (MB)
- Example: 5MB image → ~7MB as base64

**Your 7 images**:
- If each is ~500KB → Total ~3.5MB base64 → ✅ Under 10MB limit
- If each is ~2MB → Total ~14MB base64 → ❌ Over 10MB limit (need to compress)

## 🎯 Final Checklist

After following all steps above:

- [ ] Extension reloaded
- [ ] Answer key re-uploaded (7 files selected)
- [ ] "Save Configuration" clicked
- [ ] Popup console shows "✅ Local storage saved"
- [ ] Debug page shows "✓ 7 images" in local storage
- [ ] Gradescope page refreshed (F5)
- [ ] Grading console shows "✅✅✅ ANSWER KEY LOADED SUCCESSFULLY!"
- [ ] Background console shows answer key images available
- [ ] AI response shows correct answer vs student answer comparison

If all checkboxes are ✅, the extension should now work correctly!
