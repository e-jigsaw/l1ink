import { createSignal, createEffect } from "solid-js";

export const Editor = () => {
  const [text, setText] = createSignal("");
  createEffect(() => console.log(text()));
  return (
    <textarea
      value={text()}
      onInput={(e) => {
        setText(e.currentTarget.value);
      }}
    ></textarea>
  );
};
