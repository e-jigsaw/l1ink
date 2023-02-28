export default class Page {
  public text: string;
  public title: string | undefined;
  public id: string;

  constructor(id: string, str: string) {
    this.text = str;
    this.id = id;
  }

  onUpdate(str: string) {
    this.text = str;
    this.parse();
  }

  async parse() {
    const [title, ...lines] = this.text.split("\n");
    if (this.title !== title) {
      this.title = title;
      const res = await fetch("http://localhost:12345/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: this.id,
          title,
        }),
      });
      const json = await res.json();
    }
  }
}
