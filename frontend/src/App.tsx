import { useEffect, useState } from "react";
import { api } from "./api";

interface Item {
  id: number;
  name: string;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<Item[]>("/items");
      setItems(data);
    } catch (e) {
      setError(String(e));
    }
  }

  async function create() {
    if (!name.trim()) return;
    await api.post("/items", { name });
    setName("");
    load();
  }

  async function remove(id: number) {
    await api.delete(`/items/${id}`);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24 }}>Items</h1>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New item name"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button onClick={create} style={{ padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>
          Add
        </button>
      </div>

      <ul style={{ listStyle: "none" }}>
        {items.map((item) => (
          <li key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <span>{item.name}</span>
            <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: "#c00", cursor: "pointer" }}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
