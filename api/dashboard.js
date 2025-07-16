// api/dashboard.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  console.log("📊 Dashboard API chamada:", req.method);

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

  // Verificar variáveis de ambiente
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
    console.log("🔍 Buscando dados...");

    // Buscar gastos
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (expensesError) {
      console.error("❌ Erro ao buscar gastos:", expensesError);
      throw expensesError;
    }

    // Buscar configuração
    const { data: config, error: configError } = await supabase
      .from("user_config")
      .select("*")
      .limit(1);

    // Se não tem configuração, usar padrão
    const userConfig =
      config && config.length > 0
        ? config[0]
        : {
            monthly_income: 0,
            closing_day: 15,
          };

    // Buscar gastos fixos
    const { data: fixedExpenses, error: fixedError } = await supabase
      .from("fixed_expenses")
      .select("*");

    // Buscar caixinhas
    const { data: savings, error: savingsError } = await supabase
      .from("savings")
      .select("*");

    console.log("✅ Dados encontrados:", {
      expenses: expenses?.length || 0,
      fixedExpenses: fixedExpenses?.length || 0,
      savings: savings?.length || 0,
    });

    // Calcular métricas básicas
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Gastos do mês atual
    const monthlyExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.created_at);
      return (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });

    const monthlyExpensesTotal = monthlyExpenses.reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );
    const fixedExpensesTotal = (fixedExpenses || []).reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );

    // Dias para fechamento
    const closingDay = userConfig.closing_day || 15;
    let closingDate = new Date(currentYear, currentMonth, closingDay);
    if (now.getDate() >= closingDay) {
      closingDate.setMonth(currentMonth + 1);
    }
    const timeDiff = closingDate.getTime() - now.getTime();
    const daysToClose = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Gastos por forma de pagamento
    const expensesByPaymentMethod = monthlyExpenses.reduce((acc, expense) => {
      const method = expense.payment_method;
      acc[method] = (acc[method] || 0) + parseFloat(expense.amount);
      return acc;
    }, {});

    const dashboardData = {
      summary: {
        monthlyIncome: userConfig.monthly_income || 0,
        closingDay: userConfig.closing_day || 15,
        fixedExpensesTotal,
        monthlyExpensesTotal,
        daysToClose,
        availableAmount:
          (userConfig.monthly_income || 0) -
          fixedExpensesTotal -
          monthlyExpensesTotal,
      },
      expenses: expenses.slice(0, 10), // Últimos 10 gastos
      fixedExpenses: fixedExpenses || [],
      savings: savings || [],
      expensesByPaymentMethod,
    };

    console.log("📊 Dashboard data preparado:", dashboardData.summary);
    res.status(200).json({ data: dashboardData });
  } catch (error) {
    console.error("❌ Erro na API dashboard:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}
