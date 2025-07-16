// Variáveis globais
let currentConfig = {};
let fixedExpenses = [];
let savings = [];
let purchaseHistory = []; // ✅ NOVA VARIÁVEL
let editingItem = null;
let editingType = null;

// Função para obter data/hora no fuso horário de São Paulo
function getBrazilDateTime(dateString = null) {
  const date = dateString ? new Date(dateString) : new Date();
  const brazilTime = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return brazilTime.toISOString();
}

// Inicializar quando DOM estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  console.log("⚙️ Iniciando página de configurações...");
  initializeSidebar();
  initializeConfig();
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
// INITIALIZATION
// =====================================

async function initializeConfig() {
  showLoading();

  try {
    await loadAllData();
    setupEventListeners();
    hideLoading();
    showConfigContent();
    console.log("✅ Configurações carregadas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao carregar configurações:", error);
    showError("Erro ao carregar configurações: " + error.message);
  }
}

async function loadAllData() {
  console.log("📡 Carregando todos os dados...");

  try {
    // Carregar dados em paralelo (incluindo purchase history)
    const [
      configData,
      fixedData,
      savingsData,
      purchaseData,
    ] = await Promise.all([
      fetchConfig(),
      fetchFixedExpenses(),
      fetchSavings(),
      fetchPurchaseHistory(), // ✅ NOVA FUNÇÃO
    ]);

    currentConfig = configData;
    fixedExpenses = fixedData;
    savings = savingsData;
    purchaseHistory = purchaseData; // ✅ NOVA VARIÁVEL

    // Renderizar dados
    populateBasicConfig();
    renderFixedExpenses();
    renderSavings();
    renderPurchaseHistory(); // ✅ NOVA FUNÇÃO
  } catch (error) {
    console.error("❌ Erro ao carregar dados:", error);
    throw error;
  }
}

function setupEventListeners() {
  // Formulários
  document
    .getElementById("basic-config-form")
    .addEventListener("submit", handleBasicConfigSubmit);
  document
    .getElementById("fixed-expense-form")
    .addEventListener("submit", handleFixedExpenseSubmit);
  document
    .getElementById("savings-form")
    .addEventListener("submit", handleSavingsSubmit);
  document
    .getElementById("edit-form")
    .addEventListener("submit", handleEditSubmit);
  document
    .getElementById("add-savings-form")
    .addEventListener("submit", handleAddSavingsSubmit);

  // ✅ NOVO: Event listener para histórico de compras
  document
    .getElementById("purchase-history-form")
    .addEventListener("submit", handlePurchaseHistorySubmit);

  // ✅ NOVO: Calcular parcela automaticamente
  document
    .getElementById("purchase-total")
    .addEventListener("input", calculateInstallmentValue);
  document
    .getElementById("purchase-installments")
    .addEventListener("input", calculateInstallmentValue);

  // Modal
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", closeModal);
  });

  // Fechar modal clicando fora
  window.addEventListener("click", function (event) {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  });
}

// =====================================
// API CALLS
// =====================================

async function fetchConfig() {
  try {
    const response = await fetch(`${window.location.origin}/api/config`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao buscar configurações");
    }

    return result.data || {};
  } catch (error) {
    console.log("📝 Nenhuma configuração encontrada, usando padrão");
    return { monthly_income: 0, closing_day: 15 };
  }
}

async function fetchFixedExpenses() {
  try {
    const response = await fetch(
      `${window.location.origin}/api/fixed-expenses`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao buscar gastos fixos");
    }

    return result.data || [];
  } catch (error) {
    console.log("📝 Nenhum gasto fixo encontrado");
    return [];
  }
}

async function fetchSavings() {
  try {
    const response = await fetch(`${window.location.origin}/api/savings`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao buscar caixinhas");
    }

    return result.data || [];
  } catch (error) {
    console.log("📝 Nenhuma caixinha encontrada");
    return [];
  }
}

// ✅ NOVA FUNÇÃO: Buscar histórico de compras
async function fetchPurchaseHistory() {
  try {
    const response = await fetch(
      `${window.location.origin}/api/purchase-history`
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao buscar histórico de compras");
    }

    return result.data || [];
  } catch (error) {
    console.log("📝 Nenhuma compra parcelada encontrada");
    return [];
  }
}

// =====================================
// FORM HANDLERS
// =====================================

async function handleBasicConfigSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);
    const configData = {
      monthly_income: parseFloat(formData.get("monthly_income")),
      closing_day: parseInt(formData.get("closing_day")),
    };

    console.log("💾 Salvando configurações:", configData);

    const method = currentConfig.id ? "PUT" : "POST";
    const body = currentConfig.id
      ? { ...configData, id: currentConfig.id }
      : configData;

    const response = await fetch(`${window.location.origin}/api/config`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar configurações");
    }

    currentConfig = result.data;
    showSuccess("Configurações salvas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao salvar configurações:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleFixedExpenseSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);
    const expenseData = {
      name: formData.get("name"),
      amount: parseFloat(formData.get("amount")),
    };

    console.log("💾 Salvando gasto fixo:", expenseData);

    const response = await fetch(
      `${window.location.origin}/api/fixed-expenses`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar gasto fixo");
    }

    fixedExpenses.push(result.data);
    renderFixedExpenses();
    e.target.reset();
    showSuccess("Gasto fixo adicionado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao salvar gasto fixo:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleSavingsSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);
    const savingsData = {
      name: formData.get("name"),
      goal: parseFloat(formData.get("goal")),
      current_amount: parseFloat(formData.get("current_amount")) || 0,
    };

    console.log("💾 Salvando caixinha:", savingsData);

    const response = await fetch(`${window.location.origin}/api/savings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savingsData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar caixinha");
    }

    savings.push(result.data);
    renderSavings();
    e.target.reset();
    showSuccess("Caixinha criada com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao criar caixinha:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// ✅ NOVA FUNÇÃO: Handle submit do formulário de histórico de compras
async function handlePurchaseHistorySubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);
    const purchaseData = {
      description: formData.get("description"),
      total_amount: parseFloat(formData.get("total_amount")),
      installment_count: parseInt(formData.get("installment_count")),
      installment_value: parseFloat(formData.get("installment_value")),
      first_installment_date: formData.get("first_installment_date"),
    };

    console.log("💾 Salvando compra parcelada:", purchaseData);

    const response = await fetch(
      `${window.location.origin}/api/purchase-history`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(purchaseData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao salvar compra parcelada");
    }

    purchaseHistory.push(result.data);
    renderPurchaseHistory();
    e.target.reset();
    showSuccess("Compra parcelada adicionada com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao salvar compra parcelada:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// ✅ NOVA FUNÇÃO: Calcular valor da parcela automaticamente
function calculateInstallmentValue() {
  const total =
    parseFloat(document.getElementById("purchase-total").value) || 0;
  const installments =
    parseInt(document.getElementById("purchase-installments").value) || 1;
  const installmentValue = total / installments;

  document.getElementById(
    "purchase-installment-value"
  ).value = installmentValue.toFixed(2);
}

// =====================================
// RENDER FUNCTIONS
// =====================================

function populateBasicConfig() {
  document.getElementById("monthly-income").value =
    currentConfig.monthly_income || "";
  document.getElementById("closing-day").value =
    currentConfig.closing_day || "";
}

function renderFixedExpenses() {
  const container = document.getElementById("fixed-expenses-list");
  const totalElement = document.getElementById("fixed-total");

  if (fixedExpenses.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum gasto fixo cadastrado ainda</p>
            </div>
        `;
    totalElement.textContent = "R$ 0,00";
    return;
  }

  const total = fixedExpenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  );

  container.innerHTML = fixedExpenses
    .map(
      (expense) => `
        <div class="list-item fixed-expense">
            <div class="item-info">
                <h4>${expense.name}</h4>
                <p>Valor mensal: ${formatCurrency(expense.amount)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary" onclick="editFixedExpense(${
                  expense.id
                })">Editar</button>
                <button class="btn btn-danger" onclick="deleteFixedExpense(${
                  expense.id
                })">Excluir</button>
            </div>
        </div>
    `
    )
    .join("");

  totalElement.textContent = formatCurrency(total);
}

function renderSavings() {
  const container = document.getElementById("savings-list");

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
            <div class="list-item savings">
                <div class="savings-header">
                    <div class="item-info">
                        <h4>${saving.name}</h4>
                    </div>
                    <div class="savings-percentage">${percentage.toFixed(
                      1
                    )}%</div>
                </div>
                <div class="savings-progress">
                    <div class="savings-progress-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="savings-amounts">
                    <span>Atual: ${formatCurrency(saving.current_amount)}</span>
                    <span>Meta: ${formatCurrency(saving.goal)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-accent" onclick="addToSavings(${
                      saving.id
                    })">Adicionar</button>
                    <button class="btn btn-secondary" onclick="editSavings(${
                      saving.id
                    })">Editar</button>
                    <button class="btn btn-danger" onclick="deleteSavings(${
                      saving.id
                    })">Excluir</button>
                </div>
            </div>
        `;
    })
    .join("");
}

// ✅ NOVA FUNÇÃO: Renderizar histórico de compras
function renderPurchaseHistory() {
  const container = document.getElementById("purchase-history-list");
  const totalElement = document.getElementById("purchase-monthly-total");

  if (purchaseHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma compra parcelada cadastrada ainda</p>
      </div>
    `;
    totalElement.textContent = "R$ 0,00";
    return;
  }

  let monthlyTotal = 0;
  const now = new Date();

  container.innerHTML = purchaseHistory
    .map((purchase) => {
      const installmentsPaid = calculateInstallmentsPaid(purchase, now);
      const isActive =
        purchase.is_active && installmentsPaid < purchase.installment_count;
      const progressPercentage =
        (installmentsPaid / purchase.installment_count) * 100;

      // Se a compra está ativa, somar ao total mensal
      if (isActive) {
        monthlyTotal += parseFloat(purchase.installment_value);
      }

      return `
        <div class="list-item purchase-history">
          <div class="purchase-status ${isActive ? "active" : "completed"}">
            ${isActive ? "Ativa" : "Finalizada"}
          </div>
          <div class="item-info">
            <h4>${purchase.description}</h4>
            <div class="purchase-info">
              <div class="purchase-detail">
                <span class="purchase-detail-label">Valor Total</span>
                <span class="purchase-detail-value">${formatCurrency(
                  purchase.total_amount
                )}</span>
              </div>
              <div class="purchase-detail">
                <span class="purchase-detail-label">Parcelas</span>
                <span class="purchase-detail-value">${installmentsPaid}/${
        purchase.installment_count
      }</span>
              </div>
              <div class="purchase-detail">
                <span class="purchase-detail-label">Valor/Parcela</span>
                <span class="purchase-detail-value">${formatCurrency(
                  purchase.installment_value
                )}</span>
              </div>
              <div class="purchase-detail">
                <span class="purchase-detail-label">Primeira Parcela</span>
                <span class="purchase-detail-value">${new Date(
                  purchase.first_installment_date
                ).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <div class="purchase-progress">
              <div class="purchase-progress-bar">
                <div class="purchase-progress-fill" style="width: ${progressPercentage}%"></div>
              </div>
              <div class="purchase-progress-text">
                <span>${installmentsPaid} de ${
        purchase.installment_count
      } pagas</span>
                <span>${progressPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary" onclick="editPurchaseHistory(${
              purchase.id
            })">Editar</button>
            <button class="btn btn-danger" onclick="deletePurchaseHistory(${
              purchase.id
            })">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");

  totalElement.textContent = formatCurrency(monthlyTotal);
}

// ✅ NOVA FUNÇÃO: Calcular quantas parcelas já foram pagas
function calculateInstallmentsPaid(purchase, currentDate) {
  const firstInstallment = new Date(purchase.first_installment_date);
  const monthsDiff =
    (currentDate.getFullYear() - firstInstallment.getFullYear()) * 12 +
    (currentDate.getMonth() - firstInstallment.getMonth());
  return Math.max(0, Math.min(monthsDiff + 1, purchase.installment_count));
}

// =====================================
// MODAL FUNCTIONS
// =====================================

function editFixedExpense(id) {
  const expense = fixedExpenses.find((item) => item.id === id);
  if (!expense) return;

  editingItem = expense;
  editingType = "fixed-expense";

  document.getElementById("modal-title").textContent = "Editar Gasto Fixo";
  document.getElementById("edit-form-content").innerHTML = `
        <div class="form-group">
            <label for="edit-name">Nome do Gasto Fixo*</label>
            <input type="text" id="edit-name" name="name" value="${expense.name}" required>
        </div>
        <div class="form-group">
            <label for="edit-amount">Valor Mensal (R$)*</label>
            <input type="number" id="edit-amount" name="amount" value="${expense.amount}" step="0.01" required>
        </div>
    `;

  showModal("edit-modal");
}

function editSavings(id) {
  const saving = savings.find((item) => item.id === id);
  if (!saving) return;

  editingItem = saving;
  editingType = "savings";

  document.getElementById("modal-title").textContent = "Editar Caixinha";
  document.getElementById("edit-form-content").innerHTML = `
        <div class="form-group">
            <label for="edit-name">Nome da Caixinha*</label>
            <input type="text" id="edit-name" name="name" value="${saving.name}" required>
        </div>
        <div class="form-group">
            <label for="edit-goal">Meta (R$)*</label>
            <input type="number" id="edit-goal" name="goal" value="${saving.goal}" step="0.01" required>
        </div>
        <div class="form-group">
            <label for="edit-current">Valor Atual (R$)</label>
            <input type="number" id="edit-current" name="current_amount" value="${saving.current_amount}" step="0.01">
        </div>
    `;

  showModal("edit-modal");
}

// ✅ NOVA FUNÇÃO: Editar compra parcelada
function editPurchaseHistory(id) {
  const purchase = purchaseHistory.find((item) => item.id === id);
  if (!purchase) return;

  editingItem = purchase;
  editingType = "purchase-history";

  document.getElementById("modal-title").textContent =
    "Editar Compra Parcelada";
  document.getElementById("edit-form-content").innerHTML = `
    <div class="form-group">
      <label for="edit-description">Descrição da Compra*</label>
      <input type="text" id="edit-description" name="description" value="${
        purchase.description
      }" required>
    </div>
    <div class="form-group">
      <label for="edit-total">Valor Total (R$)*</label>
      <input type="number" id="edit-total" name="total_amount" value="${
        purchase.total_amount
      }" step="0.01" required>
    </div>
    <div class="form-group">
      <label for="edit-count">Número de Parcelas*</label>
      <input type="number" id="edit-count" name="installment_count" value="${
        purchase.installment_count
      }" min="1" required>
    </div>
    <div class="form-group">
      <label for="edit-value">Valor da Parcela (R$)*</label>
      <input type="number" id="edit-value" name="installment_value" value="${
        purchase.installment_value
      }" step="0.01" required>
    </div>
    <div class="form-group">
      <label for="edit-first-date">Data da Primeira Parcela*</label>
      <input type="date" id="edit-first-date" name="first_installment_date" value="${
        purchase.first_installment_date.split("T")[0]
      }" required>
    </div>
    <div class="form-group">
      <label for="edit-active">Status</label>
      <select id="edit-active" name="is_active">
        <option value="true" ${
          purchase.is_active ? "selected" : ""
        }>Ativa</option>
        <option value="false" ${
          !purchase.is_active ? "selected" : ""
        }>Finalizada</option>
      </select>
    </div>
  `;

  showModal("edit-modal");
}

function addToSavings(id) {
  const saving = savings.find((item) => item.id === id);
  if (!saving) return;

  editingItem = saving;
  editingType = "add-savings";

  document.querySelector(
    "#add-savings-modal h3"
  ).textContent = `Adicionar à ${saving.name}`;
  document.getElementById("add-amount").value = "";

  showModal("add-savings-modal");
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);

    if (editingType === "fixed-expense") {
      await updateFixedExpense(formData);
    } else if (editingType === "savings") {
      await updateSavings(formData);
    } else if (editingType === "purchase-history") {
      await updatePurchaseHistory(formData); // ✅ NOVA FUNÇÃO
    }

    closeModal();
  } catch (error) {
    console.error("❌ Erro ao editar:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleAddSavingsSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  try {
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get("amount"));

    if (!amount || amount <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }

    const newAmount = editingItem.current_amount + amount;

    const response = await fetch(
      `${window.location.origin}/api/savings/${editingItem.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingItem.name,
          goal: editingItem.goal,
          current_amount: newAmount,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao adicionar valor");
    }

    // Atualizar dados locais
    const index = savings.findIndex((item) => item.id === editingItem.id);
    if (index !== -1) {
      savings[index] = result.data;
    }

    renderSavings();
    closeModal();
    showSuccess(`${formatCurrency(amount)} adicionado à caixinha!`);
  } catch (error) {
    console.error("❌ Erro ao adicionar valor:", error);
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function updateFixedExpense(formData) {
  const expenseData = {
    name: formData.get("name"),
    amount: parseFloat(formData.get("amount")),
  };

  const response = await fetch(
    `${window.location.origin}/api/fixed-expenses/${editingItem.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao atualizar gasto fixo");
  }

  // Atualizar dados locais
  const index = fixedExpenses.findIndex((item) => item.id === editingItem.id);
  if (index !== -1) {
    fixedExpenses[index] = result.data;
  }

  renderFixedExpenses();
  showSuccess("Gasto fixo atualizado com sucesso!");
}

async function updateSavings(formData) {
  const savingsData = {
    name: formData.get("name"),
    goal: parseFloat(formData.get("goal")),
    current_amount: parseFloat(formData.get("current_amount")) || 0,
  };

  const response = await fetch(
    `${window.location.origin}/api/savings/${editingItem.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savingsData),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao atualizar caixinha");
  }

  // Atualizar dados locais
  const index = savings.findIndex((item) => item.id === editingItem.id);
  if (index !== -1) {
    savings[index] = result.data;
  }

  renderSavings();
  showSuccess("Caixinha atualizada com sucesso!");
}

// ✅ NOVA FUNÇÃO: Atualizar compra parcelada
async function updatePurchaseHistory(formData) {
  const purchaseData = {
    description: formData.get("description"),
    total_amount: parseFloat(formData.get("total_amount")),
    installment_count: parseInt(formData.get("installment_count")),
    installment_value: parseFloat(formData.get("installment_value")),
    first_installment_date: formData.get("first_installment_date"),
    is_active: formData.get("is_active") === "true",
  };

  const response = await fetch(
    `${window.location.origin}/api/purchase-history/${editingItem.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchaseData),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao atualizar compra parcelada");
  }

  // Atualizar dados locais
  const index = purchaseHistory.findIndex((item) => item.id === editingItem.id);
  if (index !== -1) {
    purchaseHistory[index] = result.data;
  }

  renderPurchaseHistory();
  showSuccess("Compra parcelada atualizada com sucesso!");
}

// =====================================
// DELETE FUNCTIONS
// =====================================

async function deleteFixedExpense(id) {
  if (!confirm("Tem certeza que deseja excluir este gasto fixo?")) return;

  try {
    const response = await fetch(
      `${window.location.origin}/api/fixed-expenses/${id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao excluir gasto fixo");
    }

    fixedExpenses = fixedExpenses.filter((item) => item.id !== id);
    renderFixedExpenses();
    showSuccess("Gasto fixo excluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao excluir gasto fixo:", error);
    showError(error.message);
  }
}

async function deleteSavings(id) {
  if (!confirm("Tem certeza que deseja excluir esta caixinha?")) return;

  try {
    const response = await fetch(
      `${window.location.origin}/api/savings/${id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao excluir caixinha");
    }

    savings = savings.filter((item) => item.id !== id);
    renderSavings();
    showSuccess("Caixinha excluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao excluir caixinha:", error);
    showError(error.message);
  }
}

// ✅ NOVA FUNÇÃO: Deletar compra parcelada
async function deletePurchaseHistory(id) {
  if (!confirm("Tem certeza que deseja excluir esta compra parcelada?")) return;

  try {
    const response = await fetch(
      `${window.location.origin}/api/purchase-history/${id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erro ao excluir compra parcelada");
    }

    purchaseHistory = purchaseHistory.filter((item) => item.id !== id);
    renderPurchaseHistory();
    showSuccess("Compra parcelada excluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao excluir compra parcelada:", error);
    showError(error.message);
  }
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

function showModal(modalId) {
  document.getElementById(modalId).style.display = "block";
}

function closeModal() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
  editingItem = null;
  editingType = null;
}

function setButtonLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = "Salvando...";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

function showLoading() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("config-content").style.display = "none";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function showConfigContent() {
  document.getElementById("config-content").style.display = "block";
}

function showSuccess(message) {
  const successElement = document.getElementById("success-message");
  successElement.textContent = message;
  successElement.style.display = "block";

  setTimeout(() => {
    successElement.style.display = "none";
  }, 5000);
}

function showError(message) {
  const errorElement = document.getElementById("error-message");
  errorElement.textContent = message;
  errorElement.style.display = "block";

  setTimeout(() => {
    errorElement.style.display = "none";
  }, 5000);
}
