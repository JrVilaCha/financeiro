// api/current-bill.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("🧾 Current Bill API chamada:", req.method);

  // Configurar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
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
    console.log("📊 Calculando fatura atual...");

    // Buscar configuração para obter dia de fechamento
    const { data: config, error: configError } = await supabase
      .from("user_config")
      .select("*")
      .limit(1);

    const userConfig =
      config && config.length > 0 ? config[0] : { closing_day: 15 };
    const closingDay = userConfig.closing_day || 15;

    // Calcular período da fatura atual
    const billPeriod = calculateCurrentBillPeriod(closingDay);

    console.log("📅 Período da fatura:", billPeriod);

    // Buscar gastos do período da fatura
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .gte("created_at", billPeriod.startDate)
      .lt("created_at", billPeriod.endDate)
      .order("created_at", { ascending: false });

    if (expensesError) {
      console.error("❌ Erro ao buscar gastos da fatura:", expensesError);
      throw expensesError;
    }

    // Calcular estatísticas da fatura
    const billStats = calculateBillStats(expenses, billPeriod);

    const currentBillData = {
      period: billPeriod,
      expenses: expenses,
      stats: billStats,
    };

    console.log("✅ Fatura atual calculada:", billStats);
    res.status(200).json({ data: currentBillData });
  } catch (error) {
    console.error("❌ Erro na API current-bill:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}

function calculateCurrentBillPeriod(closingDay) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let startDate, endDate;

  if (currentDay >= closingDay) {
    // Estamos após o fechamento, fatura atual vai até o próximo fechamento
    startDate = new Date(currentYear, currentMonth, closingDay);
    endDate = new Date(currentYear, currentMonth + 1, closingDay);
  } else {
    // Estamos antes do fechamento, fatura atual é do fechamento anterior
    startDate = new Date(currentYear, currentMonth - 1, closingDay);
    endDate = new Date(currentYear, currentMonth, closingDay);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateFormatted: startDate.toLocaleDateString("pt-BR"),
    endDateFormatted: endDate.toLocaleDateString("pt-BR"),
    daysRemaining: Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
  };
}

function calculateBillStats(expenses, period) {
  const total = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  );

  // Gastos por forma de pagamento
  const byPaymentMethod = expenses.reduce((acc, expense) => {
    const method = expense.payment_method;
    acc[method] = (acc[method] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  // Gastos por dia
  const byDay = expenses.reduce((acc, expense) => {
    const date = new Date(expense.created_at).toLocaleDateString("pt-BR");
    acc[date] = (acc[date] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  // Maior gasto
  const highestExpense =
    expenses.length > 0
      ? expenses.reduce((max, expense) =>
          parseFloat(expense.amount) > parseFloat(max.amount) ? expense : max
        )
      : null;

  // Média diária
  const daysPassed = Math.max(
    1,
    Math.ceil((new Date() - new Date(period.startDate)) / (1000 * 60 * 60 * 24))
  );
  const dailyAverage = total / daysPassed;

  return {
    total,
    count: expenses.length,
    byPaymentMethod,
    byDay,
    highestExpense,
    dailyAverage,
    daysPassed,
  };
}
