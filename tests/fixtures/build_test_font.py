"""Generate the original MIT-licensed test font; requires fontTools only to rebuild.
It intentionally contains only space and a rectangular A. Not a design asset.
"""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

builder = FontBuilder(1000, isTTF=True)
builder.setupGlyphOrder(['.notdef', 'space', 'A'])
builder.setupCharacterMap({32: 'space', 65: 'A'})
glyphs = {}
for name in ['.notdef', 'space', 'A']:
    pen = TTGlyphPen(None)
    if name != 'space':
        pen.moveTo((80, 0)); pen.lineTo((520, 0)); pen.lineTo((520, 700)); pen.lineTo((80, 700)); pen.closePath()
    glyphs[name] = pen.glyph()
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics({name: (600, 0) for name in glyphs})
builder.setupHorizontalHeader(ascent=800, descent=-200)
builder.setupNameTable({'familyName': 'HTML Media Test', 'styleName': 'Regular', 'uniqueFontIdentifier': 'HTMLMediaTest-Regular', 'fullName': 'HTML Media Test Regular', 'psName': 'HTMLMediaTest-Regular', 'version': 'Version 1.0'})
builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
builder.setupPost()
builder.setupMaxp()
builder.font['head'].created = builder.font['head'].modified = 3786912000
builder.font.recalcTimestamp = False
builder.save(Path(__file__).with_name('test-font.ttf'))
