// api/fixed-expenses.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("📋 Fixed Expenses API chamada:", req.method, req.url);
  console.log("📋 Query params:", req.query);

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
        return await getFixedExpenses(req, res, supabase);
      case "POST":
        return await createFixedExpense(req, res, supabase);
      case "PUT":
        return await updateFixedExpense(req, res, supabase);
      case "DELETE":
        return await deleteFixedExpense(req, res, supabase);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Fixed Expenses API Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}

async function getFixedExpenses(req, res, supabase) {
  console.log("📖 Buscando gastos fixos...");

  const { data, error } = await supabase
    .from("fixed_expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar gastos fixos:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Gastos fixos encontrados:", data.length);
  res.status(200).json({ data });
}

async function createFixedExpense(req, res, supabase) {
  console.log("💾 Criando gasto fixo...", req.body);

  const { name, amount } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Nome e valor são obrigatórios" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Valor deve ser maior que zero" });
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert([
      {
        name: name.trim(),
        amount: parseFloat(amount),
      },
    ])
    .select();

  if (error) {
    console.error("❌ Erro ao criar gasto fixo:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Gasto fixo criado:", data[0]);
  res
    .status(201)
    .json({ data: data[0], message: "Gasto fixo cadastrado com sucesso!" });
}

async function updateFixedExpense(req, res, supabase) {
  const { id } = req.query;

  console.log("✏️ Atualizando gasto fixo ID:", id, "Body:", req.body);

  if (!id) {
    return res.status(400).json({ error: "ID do gasto fixo é obrigatório" });
  }

  const { name, amount } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Nome e valor são obrigatórios" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Valor deve ser maior que zero" });
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .update({
      name: name.trim(),
      amount: parseFloat(amount),
    })
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao atualizar gasto fixo:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Gasto fixo não encontrado" });
  }

  console.log("✅ Gasto fixo atualizado:", data[0]);
  res
    .status(200)
    .json({ data: data[0], message: "Gasto fixo atualizado com sucesso!" });
}

async function deleteFixedExpense(req, res, supabase) {
  const { id } = req.query;

  console.log("🗑️ Deletando gasto fixo ID:", id);

  if (!id) {
    return res.status(400).json({ error: "ID do gasto fixo é obrigatório" });
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao deletar gasto fixo:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Gasto fixo não encontrado" });
  }

  console.log("✅ Gasto fixo deletado:", data[0]);
  res.status(200).json({ message: "Gasto fixo deletado com sucesso!" });
}
