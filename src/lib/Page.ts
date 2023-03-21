import { supabase } from "lib/getClient";
import type SupabaseProvider from "./ySupabase";

export default class Page {
  public text: string;
  public title: string | undefined;
  public id: string;
  public project: string | null;
  private provider: SupabaseProvider;

  constructor(id: string, str: string, provider: SupabaseProvider) {
    this.text = str;
    this.id = id;
    this.provider = provider;
    this.project = provider.project;
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
