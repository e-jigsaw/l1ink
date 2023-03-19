import { supabase } from "lib/getClient";

export default class Page {
  public text: string;
  public title: string | undefined;
  public id: string;

  constructor(id: string, str: string) {
    this.text = str;
    this.id = id;
    this.parse(true);
  }

  onUpdate(str: string) {
    this.text = str;
    this.parse();
  }

  async parse(isInit = false) {
    const [title, ...lines] = this.text.split("\n");
    if (this.title !== title) {
      this.title = title;
      if (!isInit) {
        const { data } = await supabase
          .from("pages")
          .update({ title: title })
          .eq("id", this.id);
      }
    }
  }
}
