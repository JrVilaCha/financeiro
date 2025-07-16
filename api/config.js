// api/config.js
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
  console.log("⚙️ Config API chamada:", req.method);

  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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
        return await getConfig(req, res, supabase);
      case "POST":
        return await createConfig(req, res, supabase);
      case "PUT":
        return await updateConfig(req, res, supabase);
      default:
        res.setHeader("Allow", ["GET", "POST", "PUT"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Config API Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
}

async function getConfig(req, res, supabase) {
  const { data, error } = await supabase
    .from("user_config")
    .select("*")
    .limit(1);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const config = data[0] || {
    monthly_income: 0,
    closing_day: 15,
    purchase_history: [], // Campo para histórico de compras
  };

  res.status(200).json({ data: config });
}

async function createConfig(req, res, supabase) {
  const { monthly_income, closing_day, purchase_history } = req.body;

  if (!monthly_income || !closing_day) {
    return res
      .status(400)
      .json({ error: "Renda mensal e dia de fechamento são obrigatórios" });
  }

  const configData = {
    monthly_income: parseFloat(monthly_income),
    closing_day: parseInt(closing_day),
    purchase_history: purchase_history || [],
    created_at: getBrazilDateTime(),
  };

  const { data, error } = await supabase
    .from("user_config")
    .insert([configData])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res
    .status(201)
    .json({ data: data[0], message: "Configuração salva com sucesso!" });
}

async function updateConfig(req, res, supabase) {
  const { id, monthly_income, closing_day, purchase_history } = req.body;

  // Se não tem ID, tenta encontrar o primeiro registro
  if (!id) {
    const { data: existingConfig } = await supabase
      .from("user_config")
      .select("id")
      .limit(1);

    if (existingConfig && existingConfig.length > 0) {
      req.body.id = existingConfig[0].id;
    } else {
      // Se não existe, cria um novo
      return await createConfig(req, res, supabase);
    }
  }

  const updateData = {
    monthly_income: parseFloat(monthly_income),
    closing_day: parseInt(closing_day),
    purchase_history: purchase_history || [],
    updated_at: getBrazilDateTime(),
  };

  const { data, error } = await supabase
    .from("user_config")
    .update(updateData)
    .eq("id", req.body.id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res
    .status(200)
    .json({ data: data[0], message: "Configuração atualizada com sucesso!" });
}
