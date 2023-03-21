import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    link: {
      checkInsert: () => ReturnType;
    };
  }
}

export const Link = Extension.create({
  name: "link",
  addKeyboardShortcuts() {
    return {
      "[": ({ editor }) => {
        const {
          state: {
            selection: { $from, $to },
            doc,
          },
        } = editor;
        if ($from.pos === $to.pos) {
          if (doc.nodeAt($from.pos) === null) {
            editor.commands.insertContent("[]");
            editor.commands.setTextSelection($from.pos + 1);
            return true;
          } else {
            return false;
          }
        } else {
          editor.commands.insertContentAt($from.pos, "[");
          editor.commands.insertContentAt($to.pos + 1, "]");
          return true;
        }
      },
    };
  },
});
