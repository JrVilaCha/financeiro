// api/savings.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🎯 Savings API chamada:", req.method, req.url);
  console.log("🎯 Query params:", req.query);

  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return res
      .status(500)
      .json({ error: "Variáveis de ambiente não configuradas" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    switch (req.method) {
      case "GET":
        return await getSavings(req, res, supabase);
      case "POST":
        return await createSavings(req, res, supabase);
      case "PUT":
        return await updateSavings(req, res, supabase);
      case "DELETE":
        return await deleteSavings(req, res, supabase);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Savings API Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}

async function getSavings(req, res, supabase) {
  console.log("📖 Buscando caixinhas...");

  const { data, error } = await supabase
    .from("savings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar caixinhas:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Caixinhas encontradas:", data.length);
  res.status(200).json({ data });
}

async function createSavings(req, res, supabase) {
  console.log("💾 Criando caixinha...", req.body);

  const { name, goal, current_amount } = req.body;

  if (!name || !goal) {
    return res.status(400).json({ error: "Nome e meta são obrigatórios" });
  }

  if (goal <= 0) {
    return res.status(400).json({ error: "Meta deve ser maior que zero" });
  }

  const { data, error } = await supabase
    .from("savings")
    .insert([
      {
        name: name.trim(),
        goal: parseFloat(goal),
        current_amount: parseFloat(current_amount) || 0,
      },
    ])
    .select();

  if (error) {
    console.error("❌ Erro ao criar caixinha:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Caixinha criada:", data[0]);
  res
    .status(201)
    .json({ data: data[0], message: "Caixinha criada com sucesso!" });
}

async function updateSavings(req, res, supabase) {
  const { id } = req.query;

  console.log("✏️ Atualizando caixinha ID:", id, "Body:", req.body);

  if (!id) {
    return res.status(400).json({ error: "ID da caixinha é obrigatório" });
  }

  const { name, goal, current_amount } = req.body;

  if (!name || !goal) {
    return res.status(400).json({ error: "Nome e meta são obrigatórios" });
  }

  if (goal <= 0) {
    return res.status(400).json({ error: "Meta deve ser maior que zero" });
  }

  const { data, error } = await supabase
    .from("savings")
    .update({
      name: name.trim(),
      goal: parseFloat(goal),
      current_amount: parseFloat(current_amount) || 0,
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao atualizar caixinha:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Caixinha não encontrada" });
  }

  console.log("✅ Caixinha atualizada:", data[0]);
  res
    .status(200)
    .json({ data: data[0], message: "Caixinha atualizada com sucesso!" });
}

async function deleteSavings(req, res, supabase) {
  const { id } = req.query;

  console.log("🗑️ Deletando caixinha ID:", id);

  if (!id) {
    return res.status(400).json({ error: "ID da caixinha é obrigatório" });
  }

  const { data, error } = await supabase
    .from("savings")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao deletar caixinha:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Caixinha não encontrada" });
  }

  console.log("✅ Caixinha deletada:", data[0]);
  res.status(200).json({ message: "Caixinha deletada com sucesso!" });
}
