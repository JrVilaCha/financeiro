// api/purchase-history.js
import { createClient } from "@supabase/supabase-js";

// Função para obter data/hora no fuso horário de São Paulo
function getBrazilDateTime(dateString = null) {
  const date = dateString ? new Date(dateString) : new Date();
  const brazilTime = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return brazilTime.toISOString();
}

export default async function handler(req, res) {
  console.log("🛒 Purchase History API chamada:", req.method, req.url);
  console.log("🛒 Query params:", req.query);

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
        return await getPurchaseHistory(req, res, supabase);
      case "POST":
        return await createPurchase(req, res, supabase);
      case "PUT":
        return await updatePurchase(req, res, supabase);
      case "DELETE":
        return await deletePurchase(req, res, supabase);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Purchase History API Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}

async function getPurchaseHistory(req, res, supabase) {
  console.log("📖 Buscando histórico de compras...");

  const { data, error } = await supabase
    .from("purchase_history")
    .select("*")
    .order("purchase_date", { ascending: false });

  if (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Histórico encontrado:", data.length);
  res.status(200).json({ data });
}

async function createPurchase(req, res, supabase) {
  console.log("💾 Criando compra parcelada...", req.body);

  const {
    description,
    total_amount,
    installment_count,
    installment_value,
    purchase_date,
    first_installment_date,
    is_active,
  } = req.body;

  if (
    !description ||
    !total_amount ||
    !installment_count ||
    !installment_value
  ) {
    return res.status(400).json({
      error:
        "Campos obrigatórios: description, total_amount, installment_count, installment_value",
    });
  }

  if (total_amount <= 0 || installment_count <= 0 || installment_value <= 0) {
    return res.status(400).json({
      error: "Valores devem ser maiores que zero",
    });
  }

  const purchaseData = {
    description: description.trim(),
    total_amount: parseFloat(total_amount),
    installment_count: parseInt(installment_count),
    installment_value: parseFloat(installment_value),
    purchase_date: purchase_date
      ? getBrazilDateTime(purchase_date)
      : getBrazilDateTime(),
    first_installment_date: first_installment_date
      ? getBrazilDateTime(first_installment_date)
      : getBrazilDateTime(),
    is_active: is_active !== undefined ? is_active : true,
    created_at: getBrazilDateTime(),
  };

  console.log("📝 Dados da compra:", purchaseData);

  const { data, error } = await supabase
    .from("purchase_history")
    .insert([purchaseData])
    .select();

  if (error) {
    console.error("❌ Erro ao criar compra:", error);
    return res.status(400).json({ error: error.message });
  }

  console.log("✅ Compra criada:", data[0]);
  res.status(201).json({
    data: data[0],
    message: "Compra parcelada cadastrada com sucesso!",
  });
}

async function updatePurchase(req, res, supabase) {
  const { id } = req.query;

  console.log("✏️ Atualizando compra ID:", id, "Body:", req.body);

  if (!id) {
    return res.status(400).json({ error: "ID da compra é obrigatório" });
  }

  const {
    description,
    total_amount,
    installment_count,
    installment_value,
    purchase_date,
    first_installment_date,
    is_active,
  } = req.body;

  const updateData = {
    updated_at: getBrazilDateTime(),
  };

  // Só atualiza campos que foram enviados
  if (description !== undefined) updateData.description = description.trim();
  if (total_amount !== undefined)
    updateData.total_amount = parseFloat(total_amount);
  if (installment_count !== undefined)
    updateData.installment_count = parseInt(installment_count);
  if (installment_value !== undefined)
    updateData.installment_value = parseFloat(installment_value);
  if (purchase_date !== undefined)
    updateData.purchase_date = getBrazilDateTime(purchase_date);
  if (first_installment_date !== undefined)
    updateData.first_installment_date = getBrazilDateTime(
      first_installment_date
    );
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from("purchase_history")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao atualizar compra:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Compra não encontrada" });
  }

  console.log("✅ Compra atualizada:", data[0]);
  res
    .status(200)
    .json({ data: data[0], message: "Compra atualizada com sucesso!" });
}

async function deletePurchase(req, res, supabase) {
  const { id } = req.query;

  console.log("🗑️ Deletando compra ID:", id);

  if (!id) {
    return res.status(400).json({ error: "ID da compra é obrigatório" });
  }

  const { data, error } = await supabase
    .from("purchase_history")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Erro ao deletar compra:", error);
    return res.status(400).json({ error: error.message });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: "Compra não encontrada" });
  }

  console.log("✅ Compra deletada:", data[0]);
  res.status(200).json({ message: "Compra deletada com sucesso!" });
}
