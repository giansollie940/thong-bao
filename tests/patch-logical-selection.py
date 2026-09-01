from pathlib import Path
import re

path = Path('rich-editor.js')
text = path.read_text(encoding='utf-8')

if 'let savedVisualOffsets = null;' not in text:
    text = text.replace(
        '    let savedVisualRange = null;\n',
        '    let savedVisualRange = null;\n    let savedVisualOffsets = null;\n',
        1,
    )

marker = '''    function visualHasFocus() {
      const active = document.activeElement;
      return Boolean(
        active &&
        (active === visual || visual.contains(active))
      );
    }
'''
if marker not in text:
    raise SystemExit('visualHasFocus marker not found')

helpers = marker + '''
    function visualOffsetsFromRange(range) {
      if (!range || !rangeBelongsToVisual(range)) return null;

      try {
        const startProbe = document.createRange();
        startProbe.selectNodeContents(visual);
        startProbe.setEnd(range.startContainer, range.startOffset);

        const endProbe = document.createRange();
        endProbe.selectNodeContents(visual);
        endProbe.setEnd(range.endContainer, range.endOffset);

        return {
          start: startProbe.toString().length,
          end: endProbe.toString().length
        };
      } catch {
        return null;
      }
    }

    function visualRangeFromOffsets(offsets) {
      if (!offsets) return null;

      const startTarget = Math.max(0, Number(offsets.start) || 0);
      const endTarget = Math.max(startTarget, Number(offsets.end) || 0);
      const walker = document.createTreeWalker(
        visual,
        NodeFilter.SHOW_TEXT
      );

      let position = 0;
      let startNode = null;
      let startOffset = 0;
      let endNode = null;
      let endOffset = 0;
      let lastNode = null;
      let node = walker.nextNode();

      while (node) {
        const length = node.nodeValue?.length || 0;
        const nextPosition = position + length;
        lastNode = node;

        if (!startNode && startTarget <= nextPosition) {
          startNode = node;
          startOffset = Math.min(
            length,
            Math.max(0, startTarget - position)
          );
        }

        if (!endNode && endTarget <= nextPosition) {
          endNode = node;
          endOffset = Math.min(
            length,
            Math.max(0, endTarget - position)
          );
          break;
        }

        position = nextPosition;
        node = walker.nextNode();
      }

      if (!startNode && lastNode) {
        startNode = lastNode;
        startOffset = lastNode.nodeValue?.length || 0;
      }

      if (!endNode && lastNode) {
        endNode = lastNode;
        endOffset = lastNode.nodeValue?.length || 0;
      }

      if (!startNode || !endNode) return null;

      try {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      } catch {
        return null;
      }
    }

    function rememberVisualRange(range) {
      if (!range || !rangeBelongsToVisual(range)) return false;

      savedVisualRange = range.cloneRange();
      const offsets = visualOffsetsFromRange(range);
      if (offsets) savedVisualOffsets = offsets;
      return true;
    }
'''
text = text.replace(marker, helpers, 1)

text = text.replace(
    '      savedVisualRange = null;\n      savedSourceSelection = {',
    '      savedVisualRange = null;\n      savedVisualOffsets = null;\n      savedSourceSelection = {',
    1,
)

text = text.replace(
    '      savedVisualRange = range.cloneRange();\n      return true;\n    }\n\n    function saveSourceSelection',
    '      rememberVisualRange(range);\n      return true;\n    }\n\n    function saveSourceSelection',
    1,
)

pattern = re.compile(
    r'    function restoreVisualSelection\(\{\n      focus = true\n    \} = \{\}\) \{.*?\n    \}\n\n    function restoreSourceSelection',
    re.S,
)
replacement = '''    function restoreVisualSelection({
      focus = true
    } = {}) {
      let range = savedVisualRange;

      if (!range || !rangeBelongsToVisual(range)) {
        range = visualRangeFromOffsets(savedVisualOffsets);
      }

      if (!range) return null;

      try {
        const selection = window.getSelection();
        if (!selection) return null;

        if (focus) {
          try {
            visual.focus({ preventScroll: true });
          } catch {
            visual.focus();
          }
        }

        selection.removeAllRanges();
        selection.addRange(range);
        rememberVisualRange(range);
        return range;
      } catch {
        savedVisualRange = null;
        return null;
      }
    }

    function restoreSourceSelection'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'restoreVisualSelection replacement count={count}')

text = text.replace(
    '          savedVisualRange = range.cloneRange();\n          return range;',
    '          rememberVisualRange(range);\n          return range;',
    1,
)
text = text.replace(
    '      savedVisualRange = range.cloneRange();\n    }\n\n    function placeCaretAfter',
    '      rememberVisualRange(range);\n    }\n\n    function placeCaretAfter',
    1,
)
text = text.replace(
    '      savedVisualRange = range.cloneRange();\n    }\n\n    function visualTextSegments',
    '      rememberVisualRange(range);\n    }\n\n    function visualTextSegments',
    1,
)
text = text.replace(
    '    savedVisualRange = range.cloneRange();\n  }\n\n  function wrapVisual',
    '    rememberVisualRange(range);\n  }\n\n  function wrapVisual',
    1,
)

path.write_text(text, encoding='utf-8')

index = Path('index.html')
index_text = index.read_text(encoding='utf-8').replace('?v=3.16.8', '?v=3.16.9')
index.write_text(index_text, encoding='utf-8')
