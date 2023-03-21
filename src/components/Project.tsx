import { supabase } from "lib/getClient";
import { useEffect, useState } from "react";

type MiniPage = {
  id: string;
  title: string;
};

export const Project: React.FC<{ name: string }> = ({ name }) => {
  const [pages, setPages] = useState<MiniPage[]>([]);
  useEffect(() => {
    supabase
      .from("pages")
      .select("title,id")
      .eq("project", name)
      .then((res) => {
        if (res.data) {
          setPages(res.data);
        }
      });
  }, []);
  return (
    <ul>
      {pages.map((page) => (
        <li key={page.id}>
          <a href={`/pages/${page.id}`}>{page.title}</a>
        </li>
      ))}
    </ul>
  );
};
