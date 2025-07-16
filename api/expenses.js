// api/expenses.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🚀 EXPENSES API chamada:", req.method, req.url);
  console.log("📋 Body recebido:", req.body);

  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Verificar variáveis de ambiente
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error("❌ Variáveis de ambiente não configuradas");
    return res.status(500).json({
      error: "Variáveis de ambiente não configuradas",
      details: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
  }

  console.log("✅ Variáveis de ambiente OK");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    switch (req.method) {
      case "GET":
        return await getExpenses(req, res, supabase);
      case "POST":
        return await createExpense(req, res, supabase);
      case "PUT":
        return await updateExpense(req, res, supabase);
      case "DELETE":
        return await deleteExpense(req, res, supabase);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ EXPENSES API Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

// Buscar gastos
async function getExpenses(req, res, supabase) {
  console.log("📖 Buscando gastos...");

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar gastos:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Gastos encontrados:", data.length);
  res.status(200).json({ data });
}

// Criar novo gasto - ESTA É A FUNÇÃO PRINCIPAL
async function createExpense(req, res, supabase) {
  console.log("💾 EXPENSES - Criando gasto...", req.body);

  const {
    description,
    amount,
    payment_method,
    is_installment,
    installment_count,
    installment_value,
    created_at,
  } = req.body;

  console.log("🔍 Campos recebidos:");
  console.log("- description:", description);
  console.log("- amount:", amount);
  console.log("- payment_method:", payment_method);
  console.log("- created_at:", created_at);

  // Validações CORRETAS (description, não name)
  if (!description || !amount || !payment_method) {
    console.error("❌ Campos obrigatórios faltando em EXPENSES");
    return res.status(400).json({
      error: "Campos obrigatórios: description, amount, payment_method",
      received: { description, amount, payment_method },
    });
  }

  if (amount <= 0) {
    console.error("❌ Valor inválido:", amount);
    return res.status(400).json({ error: "Valor deve ser maior que zero" });
  }

  if (payment_method === "credito" && !installment_count) {
    console.error("❌ Parcelas não informadas para crédito");
    return res.status(400).json({
      error: "Número de parcelas é obrigatório para pagamentos no crédito",
    });
  }

  const expenseData = {
    description,
    amount: parseFloat(amount),
    payment_method,
    is_installment: is_installment || false,
    installment_count: installment_count || null,
    installment_value: installment_value || null,
    created_at: created_at || new Date().toISOString(), // Usar data enviada ou atual
  };

  console.log("📝 EXPENSES - Dados a serem salvos:", expenseData);

  const { data, error } = await supabase
    .from("expenses")
    .insert([expenseData])
    .select();

  if (error) {
    console.error("❌ Erro ao salvar no EXPENSES:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ EXPENSES - Gasto salvo com sucesso:", data[0]);
  res.status(201).json({
    data: data[0],
    message: "Gasto cadastrado com sucesso!",
  });
}

// Atualizar gasto
async function updateExpense(req, res, supabase) {
  const { id } = req.query;
  const updateData = req.body;

  console.log("✏️ Atualizando gasto:", id, updateData);

  const { data, error } = await supabase
    .from("expenses")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao atualizar:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Gasto não encontrado" });
  }

  console.log("✅ Gasto atualizado:", data[0]);
  res.status(200).json({
    data: data[0],
    message: "Gasto atualizado com sucesso!",
  });
}

// Deletar gasto
async function deleteExpense(req, res, supabase) {
  const { id } = req.query;

  console.log("🗑️ EXPENSES - Deletando gasto ID:", id);

  if (!id) {
    return res.status(400).json({ error: "ID do gasto é obrigatório" });
  }

  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao deletar gasto:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Gasto não encontrado" });
  }

  console.log("✅ EXPENSES - Gasto deletado:", data[0]);
  res.status(200).json({
    message: "Gasto deletado com sucesso!",
  });
}
