// =====================================
// AUTO REFRESH
// =====================================

// Atualizar dashboard a cada 5 minutos
setInterval(() => {
  console.log("🔄 Atualizando dashboard automaticamente...");
  loadDashboard();
}, 5 * 60 * 1000); // Inicializar dashboard quando DOM estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  console.log("📊 Iniciando dashboard...");
  initializeSidebar();
  loadDashboard();
});

// =====================================
// SIDEBAR FUNCTIONALITY
// =====================================

function initializeSidebar() {
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Fechar sidebar com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSidebar();
    }
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuToggle = document.getElementById("menu-toggle");

  sidebar.classList.toggle("open");
  overlay.classList.toggle("active");
  menuToggle.classList.toggle("active");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuToggle = document.getElementById("menu-toggle");

  sidebar.classList.remove("open");
  overlay.classList.remove("active");
  menuToggle.classList.remove("active");
}

// =====================================
// MAIN FUNCTIONS
// =====================================

async function loadDashboard() {
  showLoading();

  try {
    // Carregar dados em paralelo
    const [dashboardData, currentBillData] = await Promise.all([
      fetchDashboardData(),
      fetchCurrentBillData(),
    ]);

    renderDashboard(dashboardData);
    renderCurrentBill(currentBillData);
    hideLoading();
    console.log("✅ Dashboard carregado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao carregar dashboard:", error);
    showError(error.message);
  }
}

async function fetchCurrentBillData() {
  console.log("🧾 Buscando dados da fatura atual...");

  const response = await fetch(`${window.location.origin}/api/current-bill`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao buscar dados da fatura atual");
  }

  console.log("🧾 Dados da fatura recebidos:", result.data);
  return result.data;
}

function renderCurrentBill(billData) {
  console.log("🧾 Renderizando fatura atual...");

  // Atualizar período
  document.getElementById(
    "bill-period"
  ).textContent = `${billData.period.startDateFormatted} - ${billData.period.endDateFormatted}`;

  // Atualizar card de fatura atual no resumo
  document.getElementById("current-bill").textContent = formatCurrency(
    billData.stats.total
  );

  // Atualizar estatísticas da fatura
  document.getElementById("bill-total").textContent = formatCurrency(
    billData.stats.total
  );
  document.getElementById("bill-count").textContent = billData.stats.count;
  document.getElementById("bill-daily-avg").textContent = formatCurrency(
    billData.stats.dailyAverage
  );
  document.getElementById("bill-days-remaining").textContent =
    billData.period.daysRemaining;
}

async function fetchDashboardData() {
  console.log("📡 Buscando dados da API...");

  try {
    const apiUrl = `${window.location.origin}/api/dashboard`;
    console.log("📍 URL da API:", apiUrl);

    const response = await fetch(apiUrl);
    console.log("📡 Status da resposta:", response.status, response.statusText);
    console.log("🔗 URL final:", response.url);

    // Verificar se é JSON antes de fazer parse
    const contentType = response.headers.get("content-type");
    console.log("📋 Content-Type:", contentType);

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.log("❌ Resposta não é JSON:", text.substring(0, 200));
      throw new Error(
        "API retornou HTML ao invés de JSON. Verifique se a rota /api/dashboard existe."
      );
    }

    const result = await response.json();
    console.log("📋 Dados recebidos:", result);

    if (!response.ok) {
      throw new Error(result.error || "Erro ao buscar dados do dashboard");
    }

    return result.data;
  } catch (error) {
    console.error("❌ Erro detalhado:", error);
    throw error;
  }
}

function renderDashboard(data) {
  console.log("🎨 Renderizando dashboard...");

  renderSummaryCards(data.summary);
  renderRecentExpenses(data.expenses);
  renderPaymentMethods(data.expensesByPaymentMethod);
  renderFixedExpenses(data.fixedExpenses);
  renderSavings(data.savings);

  showDashboard();
}

// =====================================
// RENDER FUNCTIONS
// =====================================

function renderSummaryCards(summary) {
  document.getElementById("monthly-income").textContent = formatCurrency(
    summary.monthlyIncome
  );
  document.getElementById("fixed-expenses").textContent = formatCurrency(
    summary.fixedExpensesTotal
  );
  document.getElementById("monthly-expenses").textContent = formatCurrency(
    summary.monthlyExpensesTotal
  );
  document.getElementById("available-amount").textContent = formatCurrency(
    summary.availableAmount
  );
  document.getElementById("days-to-close").textContent = summary.daysToClose;

  // Adicionar classe de cor baseada no valor disponível
  const availableElement = document.getElementById("available-amount");
  if (summary.availableAmount < 0) {
    availableElement.style.color = "#f44336";
  } else if (summary.availableAmount < summary.monthlyIncome * 0.1) {
    availableElement.style.color = "#ff9800";
  } else {
    availableElement.style.color = "#4caf50";
  }
}

function renderRecentExpenses(expenses) {
  const container = document.getElementById("recent-expenses");
  const countElement = document.getElementById("expenses-count");

  countElement.textContent = `${expenses.length} gastos`;

  if (expenses.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum gasto registrado ainda</p>
            </div>
        `;
    return;
  }

  container.innerHTML = expenses
    .map(
      (expense) => `
        <div class="expense-item">
            <div class="expense-info">
                <h4>${expense.description}</h4>
                <p>${formatDate(expense.created_at)}</p>
                <span class="expense-method">${formatPaymentMethod(
                  expense.payment_method
                )}</span>
            </div>
            <div class="expense-actions">
                <div class="expense-amount">${formatCurrency(
                  expense.amount
                )}</div>
                <button class="btn-delete" onclick="deleteExpense(${
                  expense.id
                })" title="Excluir gasto">
                    🗑️
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function renderPaymentMethods(paymentMethods) {
  const container = document.getElementById("payment-methods");

  const methods = Object.entries(paymentMethods);

  if (methods.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum gasto neste mês</p>
            </div>
        `;
    return;
  }

  container.innerHTML = methods
    .map(
      ([method, amount]) => `
        <div class="payment-method-item">
            <div class="payment-method-info">
                <div class="payment-icon">${getPaymentIcon(method)}</div>
                <span class="payment-method-name">${formatPaymentMethod(
                  method
                )}</span>
            </div>
            <div class="payment-amount">${formatCurrency(amount)}</div>
        </div>
    `
    )
    .join("");
}

function renderFixedExpenses(fixedExpenses) {
  const container = document.getElementById("fixed-expenses-list");
  const countElement = document.getElementById("fixed-count");

  countElement.textContent = `${fixedExpenses.length} itens`;

  if (fixedExpenses.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum gasto fixo cadastrado</p>
            </div>
        `;
    return;
  }

  container.innerHTML = fixedExpenses
    .map(
      (expense) => `
        <div class="fixed-expense-item">
            <div class="fixed-expense-name">${expense.name}</div>
            <div class="fixed-expense-amount">${formatCurrency(
              expense.amount
            )}</div>
        </div>
    `
    )
    .join("");
}

function renderSavings(savings) {
  const container = document.getElementById("savings-list");
  const countElement = document.getElementById("savings-count");

  countElement.textContent = `${savings.length} caixinhas`;

  if (savings.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma caixinha criada ainda</p>
            </div>
        `;
    return;
  }

  container.innerHTML = savings
    .map((saving) => {
      const percentage = Math.min(
        (saving.current_amount / saving.goal) * 100,
        100
      );

      return `
            <div class="savings-item">
                <div class="savings-header">
                    <div class="savings-name">${saving.name}</div>
                    <div class="savings-percentage">${percentage.toFixed(
                      1
                    )}%</div>
                </div>
                <div class="savings-progress">
                    <div class="savings-progress-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="savings-amounts">
                    <div class="savings-current">${formatCurrency(
                      saving.current_amount
                    )}</div>
                    <div class="savings-goal">Meta: ${formatCurrency(
                      saving.goal
                    )}</div>
                </div>
            </div>
        `;
    })
    .join("");
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

function formatCurrency(amount) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount || 0);
}

function formatDate(dateString) {
  const date = new Date(dateString);

  // Formato: DD/MM/AAAA - HHhMM
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} - ${hours}h${minutes}`;
}

function formatPaymentMethod(method) {
  const methods = {
    debito: "Débito",
    credito: "Crédito",
    avista: "À Vista",
    pix: "PIX",
  };
  return methods[method] || method;
}

function getPaymentIcon(method) {
  const icons = {
    debito: "DB",
    credito: "CR",
    avista: "AV",
    pix: "PIX",
  };
  return icons[method] || "💳";
}

// =====================================
// UI STATE FUNCTIONS
// =====================================

function showLoading() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("dashboard-content").style.display = "none";
  document.getElementById("error-state").style.display = "none";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function showDashboard() {
  document.getElementById("dashboard-content").style.display = "block";
  document.getElementById("error-state").style.display = "none";
}

function showError(message) {
  document.getElementById("loading").style.display = "none";
  document.getElementById("dashboard-content").style.display = "none";
  document.getElementById("error-state").style.display = "block";
  document.getElementById("error-message").textContent = message;
}

// =====================================
// DELETE FUNCTIONS
// =====================================

async function deleteExpense(id) {
  if (!confirm("Tem certeza que deseja excluir este gasto?")) return;

  try {
    console.log("🗑️ Excluindo gasto ID:", id);

    const response = await fetch(
      `${window.location.origin}/api/expenses/${id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao excluir gasto");
    }

    console.log("✅ Gasto excluído com sucesso");

    // Recarregar dashboard
    await loadDashboard();

    // Mostrar mensagem de sucesso
    showSuccessMessage("Gasto excluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao excluir gasto:", error);
    showErrorMessage("Erro ao excluir gasto: " + error.message);
  }
}

function showSuccessMessage(message) {
  // Criar elemento de mensagem temporário
  const messageDiv = document.createElement("div");
  messageDiv.className = "success-toast";
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #d4edda;
        color: #155724;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
        z-index: 1000;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

  document.body.appendChild(messageDiv);

  // Remover após 3 segundos
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

function showErrorMessage(message) {
  // Criar elemento de mensagem temporário
  const messageDiv = document.createElement("div");
  messageDiv.className = "error-toast";
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        z-index: 1000;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

  document.body.appendChild(messageDiv);

  // Remover após 5 segundos
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
}
