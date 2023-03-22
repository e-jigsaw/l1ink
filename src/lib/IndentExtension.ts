import { Extension } from "@tiptap/core";

export const Indent = Extension.create({
  name: "indent",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const {
          state: {
            selection: { $from, $to },
          },
        } = editor;
        if ($from.pos === $to.pos) {
          editor.commands.insertContent("\t");
        }
        return true;
      },
      "Shift-Tab": ({ editor }) => {
        const {
          state: {
            selection: { $from, $to },
            doc,
          },
        } = editor;
        if ($from.pos === $to.pos) {
          if ($from.parentOffset > 0) {
            const candidate = doc.textBetween(
              $from.pos - $from.parentOffset,
              $from.pos
            );
            if (/^\t+$/.test(candidate)) {
              editor.commands.deleteRange({
                from: $from.pos - 1,
                to: $from.pos,
              });
            }
          }
        }
        return true;
      },
    };
  },
});
